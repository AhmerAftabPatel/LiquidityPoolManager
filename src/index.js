import WalletService from './services/WalletService.js';
import LiquidityService from './services/LiquidityService.js';
import PriceService from './services/PriceService.js';
import { logger } from './utils/logger.js';
import { NETWORKS } from './config/networks.js';

class App {
    static async initialize() {
        try {
            // Connect wallet to Fuji testnet
            await WalletService.connect(NETWORKS.AVALANCHE_TESTNET);
            logger.info('Wallet connected to Fuji testnet');

            // Initialize services
            await PriceService.initialize();
            await LiquidityService.initialize();

            logger.info('Application initialized successfully');
            logger.info(`Wallet address: ${await WalletService.signer.getAddress()}`);
            logger.info(`View on explorer: ${NETWORKS.AVALANCHE_TESTNET.blockExplorer}/address/${await WalletService.signer.getAddress()}`);
        } catch (error) {
            logger.error('Application initialization failed:', error);
            throw error;
        }
    }
}

// SUGGESTED - Node.js environment
const main = async () => {
    try {
        await App.initialize();
    } catch (error) {
        logger.error('Application failed to start:', error);
        process.exit(1);
    }
};

main();
