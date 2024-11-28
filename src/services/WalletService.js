import { ethers } from 'ethers';
import { NETWORKS } from '../config/networks.js';
import { ERRORS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class WalletService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
    }

    /**
     * Initialize connection to network
     */
    async connect() {
        try {
            // Connect to Fuji testnet
            this.provider = new ethers.providers.JsonRpcProvider(
                NETWORKS.AVALANCHE_TESTNET.rpcUrl
            );
            
            if (!process.env.PRIVATE_KEY) {
                throw new Error('PRIVATE_KEY not found in .env file');
            }

            this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            this.address = await this.signer.getAddress();

            const network = await this.provider.getNetwork();
            if (network.chainId !== parseInt(NETWORKS.AVALANCHE_TESTNET.chainId)) {
                throw new Error('Connected to wrong network');
            }

            logger.info(`Connected to wallet: ${this.address}`);
            logger.info(`Network: ${NETWORKS.AVALANCHE_TESTNET.name}`);
            return true;
        } catch (error) {
            logger.error('Wallet connection failed:', error);
            throw error;
        }
    }

 
    async checkGasBalance(minAvax) {
        try {
            const balance = await this.provider.getBalance(this.address);
            const hasEnoughBalance = balance.gte(ethers.utils.parseEther(minAvax));
            
            if (!hasEnoughBalance) {
                logger.warn(`Low balance: ${ethers.utils.formatEther(balance)} AVAX`);
            }
            
            return hasEnoughBalance;
        } catch (error) {
            logger.error('Failed to check gas balance:', error);
            throw error;
        }
    }
}

export default new WalletService();
