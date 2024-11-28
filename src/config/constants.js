/**
 * Application-wide constants
 */
export const CONSTANTS = {
    // Minimum AVAX to keep for gas (in AVAX)
    MIN_AVAX_FOR_GAS: '0.1',
    
    // Minimum rewards value to trigger claim (in USD)
    MIN_REWARD_TO_CLAIM: '0',
    
    // Polling intervals (in milliseconds)
    POLLING: {
        ACTIVE_BIN: 30000,      // 30 seconds
        REWARDS: 300000,        // 5 minutes
        PRICE: 60000           // 1 minute
    },
    
    // Gas settings
    GAS: {
        PRIORITY_FEE: '3',     // GWEI
        MAX_FEE: '100'        
    }
};

// Error messages
export const ERRORS = {
    WALLET_NOT_FOUND: 'Rabby wallet not detected',
    NETWORK_SWITCH_FAILED: 'Failed to switch to Avalanche network',
    INSUFFICIENT_GAS: 'Insufficient AVAX for gas',
    TRANSACTION_FAILED: 'Transaction failed',
};
