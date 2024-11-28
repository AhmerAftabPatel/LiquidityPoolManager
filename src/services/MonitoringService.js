import { logger } from '../utils/logger.js';

class MonitoringService {
    constructor() {
        this.metrics = {
            rebalanceCount: 0,
            failedRebalances: 0,
            totalGasSpent: ethers.BigNumber.from(0),
            rewardsCollected: ethers.BigNumber.from(0)
        };
    }

    logRebalance(success, gasUsed) {
        if (success) {
            this.metrics.rebalanceCount++;
        } else {
            this.metrics.failedRebalances++;
        }
        this.metrics.totalGasSpent = this.metrics.totalGasSpent.add(gasUsed);
        this.logMetrics();
    }

    logMetrics() {
        logger.info('Performance Metrics:', {
            rebalanceCount: this.metrics.rebalanceCount,
            failedRebalances: this.metrics.failedRebalances,
            totalGasSpent: ethers.utils.formatEther(this.metrics.totalGasSpent),
            rewardsCollected: ethers.utils.formatEther(this.metrics.rewardsCollected)
        });
    }
}

export default new MonitoringService(); 