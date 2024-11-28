import { ethers } from 'ethers';
import { ADDRESSES } from '../contracts/addresses.js';
import { CONSTANTS } from '../config/constants.js';
import {ERC20ABI} from '../contracts/abis/ERC20.js';
import WalletService from './WalletService.js';
import { logger } from '../utils/logger.js';

class PriceService {
    constructor() {
        this.joeToken = null;
        this.prices = {
            joe: 0,
            avax: 0
        };
    }

    async initialize() {
        try {
            this.joeToken = new ethers.Contract(
                ADDRESSES.TRADER_JOE.JOE_TOKEN,
                ERC20ABI,
                WalletService.signer
            );
            
            await this.startPriceMonitoring();
            logger.info('Price service initialized');
        } catch (error) {
            logger.error('Price service initialization failed:', error);
            throw error;
        }
    }

    async startPriceMonitoring() {
        setInterval(async () => {
            try {
                await this.updatePrices();
            } catch (error) {
                logger.error('Price update failed:', error);
            }
        }, CONSTANTS.POLLING.PRICE);
    }

    async updatePrices() {
        try {
            const reserves = await this.getPoolReserves();
            
            // Calculate JOE price in terms of AVAX
            const joePerAvax = ethers.utils.formatEther(reserves.avaxReserve) / 
                              ethers.utils.formatEther(reserves.joeReserve);
            
            // Get AVAX price from Chainlink
            const avaxPrice = await this.getAVAXPrice();
            this.prices.joe = joePerAvax * avaxPrice;
            this.prices.avax = avaxPrice;

            logger.debug(`Updated prices - JOE: $${this.prices.joe} - ${joePerAvax}, AVAX: $${this.prices.avax}`);
        } catch (error) {
            logger.error('Failed to update prices:', error);
            throw error;
        }
    }

    async getPoolReserves() {
        try {
            const pair = new ethers.Contract(
                ADDRESSES.TRADER_JOE.JOE_AVAX_PAIR,
                ['function getReserves() external view returns (uint256, uint256)'],
                WalletService.provider
            );
            const [reserve0, reserve1] = await pair.getReserves();
            return {
                joeReserve: reserve0,
                avaxReserve: reserve1
            };
        } catch (error) {
            logger.error('Failed to get reserves:', error);
            throw error;
        }
    }

    async getAVAXPrice() {
        try {
            const priceFeed = new ethers.Contract(
                ADDRESSES.CHAINLINK.AVAX_USD_FEED,
                ['function latestAnswer() external view returns (int256)'],
                WalletService.provider
            );
            const price = await priceFeed.latestAnswer();
            return Number(ethers.utils.formatUnits(price, 8)); // Chainlink prices have 8 decimals
        } catch (error) {
            logger.error('Failed to get AVAX price:', error);
            throw error;
        }
    }

    convertToUSD(amount, token) {
        if (token.toLowerCase() === 'joe') {
            return amount * this.prices.joe;
        } else if (token.toLowerCase() === 'avax') {
            return amount * this.prices.avax;
        }
        throw new Error('Unsupported token');
    }
}

export default new PriceService();
