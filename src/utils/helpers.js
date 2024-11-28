import { ethers } from 'ethers';
import { CONSTANTS } from '../config/constants.js';

/**
 * Helper functions for common operations
 */
export const helpers = {
    /**
     * Format amount with specified decimals
     */
    formatAmount(amount, decimals = 18) {
        return ethers.utils.formatUnits(amount, decimals);
    },

    /**
     * Parse amount to wei
     */
    parseAmount(amount, decimals = 18) {
        return ethers.utils.parseUnits(amount.toString(), decimals);
    },

    /**
     * Calculate optimal gas price
     */
    async calculateGasPrice(provider) {
        const feeData = await provider.getFeeData();
        console.log('Max Fee Per Gas:', ethers.utils.formatUnits(feeData.maxFeePerGas, 'gwei'), 'gwei');
        console.log('Priority Fee:', CONSTANTS.GAS.PRIORITY_FEE, 'gwei');
        return {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: ethers.utils.parseUnits(
                CONSTANTS.GAS.PRIORITY_FEE,
                'gwei'
            )
        };
    },

    /**
     * Sleep function for delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Validate transaction receipt
     */
    validateReceipt(receipt) {
        if (!receipt.status) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }
}; 