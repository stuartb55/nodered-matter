/**
 * Base Cluster Adapter
 * Abstract base class for all cluster adapters
 */

const { ClusterError } = require('../errors');

class BaseClusterAdapter {
    constructor(cluster, options = {}) {
        this.cluster = cluster;
        this.options = {
            pollInterval: options.pollInterval || 0, // 0 = no polling
            outputOnChange: options.outputOnChange || true,
            ...options
        };
        this.logger = options.logger || console;
        this.subscription = null;
        this.pollTimer = null;
    }

    async initialize() {
        // Override in subclasses
    }

    async readState() {
        throw new Error('readState() must be implemented by subclass');
    }

    async subscribe(callback) {
        if (this.subscription) {
            this.logger.warn('Already subscribed to cluster');
            return;
        }

        try {
            this.subscription = await this.createSubscription(callback);
            this.logger.info(`Subscribed to ${this.constructor.name}`);
        } catch (error) {
            throw new ClusterError(
                `Failed to subscribe to ${this.constructor.name}: ${error.message}`,
                'SUBSCRIPTION_FAILED',
                { clusterType: this.constructor.name, originalError: error.message }
            );
        }
    }

    async createSubscription(callback) {
        // Override in subclasses to implement cluster-specific subscription
        throw new Error('createSubscription() must be implemented by subclass');
    }

    async unsubscribe() {
        if (this.subscription) {
            try {
                await this.subscription.close();
                this.subscription = null;
                this.logger.info(`Unsubscribed from ${this.constructor.name}`);
            } catch (error) {
                this.logger.warn(`Error unsubscribing from ${this.constructor.name}: ${error.message}`);
            }
        }

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    startPolling(callback) {
        if (this.options.pollInterval <= 0) {
            return;
        }

        this.pollTimer = setInterval(async () => {
            try {
                const state = await this.readState();
                callback(state);
            } catch (error) {
                this.logger.warn(`Polling error in ${this.constructor.name}: ${error.message}`);
            }
        }, this.options.pollInterval * 1000);

        this.logger.info(`Started polling ${this.constructor.name} (interval: ${this.options.pollInterval}s)`);
    }

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
            this.logger.info(`Stopped polling ${this.constructor.name}`);
        }
    }

    formatOutput(state) {
        // Default output format - can be overridden by subclasses
        return {
            payload: state,
            timestamp: new Date().toISOString(),
            cluster: this.constructor.name
        };
    }

    async close() {
        await this.unsubscribe();
        this.stopPolling();
    }

    getClusterType() {
        return this.constructor.name;
    }

    getOptions() {
        return this.options;
    }
}

module.exports = BaseClusterAdapter;
