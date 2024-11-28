/**
 * Custom logger implementation
 */
export const logger = {
    info(message, ...args) {
        console.log(`[INFO] ${message}`, ...args);
    },

    error(message, error) {
        console.error(`[ERROR] ${message}`, error);
    },

    debug(message, ...args) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },

    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }
};
