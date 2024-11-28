import { ethers } from 'ethers';
import { ADDRESSES } from '../contracts/addresses.js';
import { CONSTANTS, ERRORS } from '../config/constants.js';
import { LBPairAbi as LBPairABI } from '../contracts/abis/LBpair.js';
import { LBROUTER as LBRouterABI} from '../contracts/abis/LBrouter.js';
import WalletService from './WalletService.js';
import { logger } from '../utils/logger.js';
import { helpers } from '../utils/helpers.js';
import {ERC20ABI} from '../contracts/abis/ERC20.js';
import PriceService from './PriceService.js';

class LiquidityService {
    constructor() {
        this.router = null;
        this.pair = null;
        this.currentBin = null;
        this.isMonitoring = false;
        this.binStep = 20;
    }

    async initialize() {
        try {
            this.router = new ethers.Contract(
                ADDRESSES.TRADER_JOE.ROUTER,
                LBRouterABI,
                WalletService.signer
            );

            this.pair = new ethers.Contract(
                ADDRESSES.TRADER_JOE.JOE_AVAX_PAIR,
                LBPairABI,
                WalletService.signer
            );

            this.binStep = await this.pair.getBinStep();
            console.log('Pair binStep:', this.binStep);

            this.currentBin = await this.getActiveBin();
            logger.info(`Initial active bin: ${this.currentBin}`);

            this.startMonitoring();
        } catch (error) {
            logger.error('Initialization failed:', error);
            throw error;
        }
    }

    async startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        console.info("Monitoring started")
        setInterval(async () => {
            try {
                await this.checkAndRebalance();
            } catch (error) {
                logger.error('Rebalance check failed:', error);
            }
        }, CONSTANTS.POLLING.ACTIVE_BIN);

        setInterval(async () => {
            try {
                await this.checkAndClaimRewards();
            } catch (error) {
                logger.error('Rewards check failed:', error);
            }
        }, CONSTANTS.POLLING.REWARDS);
    }

    async getActiveBin() {
        try {
            const activeId = await this.pair.getActiveId();
            const [reserveX, reserveY] = await this.pair.getBin(activeId);
            
            if (reserveX.isZero() && reserveY.isZero()) {
                const nextBin = await this.pair.getNextNonEmptyBin(activeId, true);
                return nextBin;
            }
            
            return activeId;
        } catch (error) {
            logger.error('Failed to get active bin:', error);
            throw error;
        }
    }

    async addLiquidity(bin) {
        try {
            const joeToken = new ethers.Contract(
                ADDRESSES.TRADER_JOE.JOE_TOKEN,
                ERC20ABI,
                WalletService.signer
            );
            
            const wavaxToken = new ethers.Contract(
                ADDRESSES.TOKENS.WAVAX,
                ERC20ABI,
                WalletService.signer
            );

            // Get balances
            const joeBalance = await this.getJOEBalance();
            const avaxBalance = await WalletService.provider.getBalance(WalletService.address);
            const avaxForLiquidity = avaxBalance.sub(
                ethers.utils.parseUnits(CONSTANTS.MIN_AVAX_FOR_GAS)
            );

            // Check balances
            if (joeBalance.isZero() || avaxForLiquidity.isZero()) {
                logger.warn('Insufficient balance for adding liquidity');
                return null;
            }

            
            const joeAllowance = await joeToken.allowance(WalletService.address, this.router.address);
            if (joeAllowance.lt(joeBalance)) {
                logger.info('Approving JOE tokens for router');
                const joeApproveTx = await joeToken.approve(this.router.address, ethers.constants.MaxUint256);
                await joeApproveTx.wait(1);
                logger.info('JOE approval confirmed');
            }

           
            const wavaxAllowance = await wavaxToken.allowance(WalletService.address, this.router.address);
            if (wavaxAllowance.lt(avaxForLiquidity)) {
                logger.info('Approving WAVAX tokens for router');
                const wavaxApproveTx = await wavaxToken.approve(this.router.address, ethers.constants.MaxUint256);
                await wavaxApproveTx.wait(1);
                logger.info('WAVAX approval confirmed');
            }

            
            const liquidityParameters = {
                tokenX: ADDRESSES.TRADER_JOE.JOE_TOKEN,
                tokenY: ADDRESSES.TOKENS.WAVAX,
                binStep: this.binStep,
                amountX: joeBalance,
                amountY: avaxForLiquidity,
                amountXMin: 0,  
                amountYMin: 0, 
                activeIdDesired: bin,
                idSlippage: 2, 
                deltaIds: [0],  
                distributionX: [100000], 
                distributionY: [100000], 
                to: WalletService.address,
                refundTo: WalletService.address,
                deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
            };

            logger.info('Adding liquidity with parameters:', {
                bin,
                amountX: ethers.utils.formatEther(joeBalance),
                amountY: ethers.utils.formatEther(avaxForLiquidity)
            });

            const tx = await this.router.addLiquidity(
                liquidityParameters,
                { 
                    ...await helpers.calculateGasPrice(WalletService.provider),
                    // value: avaxForLiquidity,
                    gasLimit: 1000000
                }
            );

            logger.info(`Add liquidity transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait(2);
            logger.info(`Add liquidity transaction confirmed: ${receipt.transactionHash}`);

            return helpers.validateReceipt(receipt);
        } catch (error) {
            logger.error('Add liquidity failed:', error);
            throw error;
        }
    }

    async calculateMinAmounts(amountX, amountY, slippageTolerance = 0.005) {
        return {
            amountXMin: amountX.mul(1000 - Math.floor(slippageTolerance * 1000)).div(1000),
            amountYMin: amountY.mul(1000 - Math.floor(slippageTolerance * 1000)).div(1000)
        };
    }

    async removeLiquidity(bin) {
        try {
            const isApproved = await this.pair.isApprovedForAll(WalletService.address, this.router.address);
            if (!isApproved) {
                await this.pair.setApprovalForAll(this.router.address, true);
            }

            
            const scanRange = 50; 
            const binIds = Array.from(
                { length: scanRange * 2 + 1 }, 
                (_, i) => bin - scanRange + i
            );

            const addresses = Array(binIds.length).fill(WalletService.address);

            const balances = await this.pair.balanceOfBatch(addresses, binIds);

            const activeBins = binIds.filter((_, index) => !balances[index].isZero());
            const activeBalances = balances.filter(balance => !balance.isZero());

            if (activeBins.length === 0) {
                logger.info('No liquidity found in any bins');
                return null;
            }

            logger.info(`Found liquidity in ${activeBins.length} bins:`, {
                bins: activeBins.map(bin => bin.toString()),
                balances: activeBalances.map(bal => ethers.utils.formatEther(bal))
            });

            const tx = await this.router.removeLiquidity(
                ADDRESSES.TRADER_JOE.JOE_TOKEN,
                ADDRESSES.TOKENS.WAVAX,
                this.binStep,
                0, 
                0,  
                activeBins,
                activeBalances,
                WalletService.address,
                Math.floor(Date.now() / 1000) + 3600,
                { 
                    ...await helpers.calculateGasPrice(WalletService.provider),
                    gasLimit: 1000000 * Math.ceil(activeBins.length / 10) 
                }
            );

            logger.info(`Remove liquidity transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait(2);
            logger.info(`Remove liquidity transaction confirmed: ${receipt.transactionHash}`, {
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice.toString()
            });
            
            return helpers.validateReceipt(receipt);
        } catch (error) {
            logger.error('Remove liquidity failed:', error);
            throw error;
        }
    }

    
    async getAllActiveBins() {
        try {
            const currentBin = await this.getActiveBin();
            const scanRange = 50;
            
            const binIds = Array.from(
                { length: scanRange * 2 + 1 }, 
                (_, i) => currentBin - scanRange + i
            );
            
            const addresses = Array(binIds.length).fill(WalletService.address);
            const balances = await this.pair.balanceOfBatch(addresses, binIds);

            const activeBins = {
                binIds: [],
                balances: []
            };

            binIds.forEach((binId, index) => {
                if (!balances[index].isZero()) {
                    activeBins.binIds.push(binId);
                    activeBins.balances.push(balances[index]);
                }
            });

            logger.info(`Found ${activeBins.binIds.length} active bins`);
            return activeBins;
        } catch (error) {
            logger.error('Failed to get active bins:', error);
            throw error;
        }
    }

    async checkAndRebalance() {
        try {
            const newBin = await this.getActiveBin();
            
            if (newBin !== this.currentBin) {
                logger.info(`Bin change detected: ${this.currentBin} -> ${newBin}`);
                
                if (!await WalletService.checkGasBalance(CONSTANTS.MIN_AVAX_FOR_GAS)) {
                    throw new Error(ERRORS.INSUFFICIENT_GAS);
                }

                await this.rebalanceLiquidity(newBin);
                this.currentBin = newBin;
            }
        } catch (error) {
            logger.error('Rebalance check failed:', error);
            throw error;
        }
    }

    async rebalanceLiquidity(newBin) {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const removeTx = await this.removeLiquidity(this.currentBin);
                if (removeTx) await removeTx.wait(2);
                logger.info(`Removed liquidity from bin ${this.currentBin}`);

                const addTx = await this.addLiquidity(newBin);
                await addTx.wait(2);
                logger.info(`Added liquidity to bin ${newBin}`);
                
                return;
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    logger.error('Rebalance failed after max retries:', error);
                    throw error;
                }
                logger.warn(`Rebalance attempt ${retryCount} failed, retrying...`);
                await helpers.sleep(5000);
            }
        }
    }

    decodeAmounts(amounts) {
      
       
        const amountsBigInt = BigInt(`0x${Buffer.from(amounts).toString('hex')}`);
      
        
        const amountsX = amountsBigInt & ((BigInt(2) ** BigInt(128)) - BigInt(1));
      
        //  128 bits of the 256 bits
        const amountsY = amountsBigInt >> BigInt(128);
      
        return [amountsX, amountsY];
      }

    async getRewards() {
        try {
            console.info("Inside rewards")
            const balance = await this.pair.balanceOf(
                WalletService.address,
                this.currentBin
            );
            const reserves = await this.pair.getReserves();
            console.log("totalSupply", reserves)
            if (balance.isZero()) {
                return ethers.constants.Zero;
            }

           
            const [reserveXBefore, reserveYBefore] = await this.pair.getBin(this.currentBin);
            console.log(this.decodeAmounts([reserveXBefore, reserveYBefore]), "decoded anounts of reverse in the bin")
            
            console.log('ReserveX (JOE):', ethers.utils.formatEther(reserveXBefore));
            console.log('ReserveY (AVAX):', ethers.utils.formatEther(reserveYBefore));
            
            
            const totalSupply = await this.pair.totalSupply(this.currentBin);
            
            const shareOfPool = balance.mul(ethers.constants.WeiPerEther).div(totalSupply);
            const feeJOE = reserveXBefore.mul(shareOfPool).div(ethers.constants.WeiPerEther);
            
            return feeJOE;
        } catch (error) {
            logger.error('Get rewards failed:', error);
            throw error;
        }
    }

    async checkAndClaimRewards() {
        try {
            const rewards = await this.getRewards();
            const rewardsValue = PriceService.convertToUSD(
                Number(ethers.utils.formatEther(rewards)),
                'joe'
            );
            console.log("totalRewardValue", rewardsValue);

            if (rewardsValue >= CONSTANTS.MIN_REWARD_TO_CLAIM) {
                if (!await WalletService.checkGasBalance(CONSTANTS.MIN_AVAX_FOR_GAS)) {
                    throw new Error(ERRORS.INSUFFICIENT_GAS);
                }

                // Get active bins with balances
                const activeBins = await this.getAllActiveBins();
                
                // Burn tokens to claim fees
                const burnTx = await this.pair.burn(
                    activeBins.binIds,
                    activeBins.balances,
                    WalletService.address,
                    { 
                        ...await helpers.calculateGasPrice(WalletService.provider),
                        gasLimit: 1000000 * Math.ceil(activeBins.binIds.length / 10)
                    }
                );

                logger.info(`Claim rewards transaction sent: ${burnTx.hash}`);
                await burnTx.wait(2);
                logger.info('Successfully claimed rewards');

                // Reinvest the claimed rewards
                const addTx = await this.addLiquidity(this.currentBin);
                await addTx.wait(2);
                logger.info('Successfully reinvested rewards');

                return helpers.validateReceipt(addTx);
            }
        } catch (error) {
            logger.error('Check rewards failed:', error);
            throw error;
        }
    }

    async getJOEBalance() {
        const joeToken = new ethers.Contract(
            ADDRESSES.TRADER_JOE.JOE_TOKEN,
            ERC20ABI,
            WalletService.signer
        );
        return await joeToken.balanceOf(WalletService.address);
    }

    async getAVAXBalance() {
        return await WalletService.provider.getBalance(WalletService.address);
    }
}


const liquidityService = new LiquidityService();
export default liquidityService;
