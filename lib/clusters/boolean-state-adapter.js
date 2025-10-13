/**
 * Boolean State Cluster Adapter
 * Handles contact sensors and other boolean state devices
 */

const BaseClusterAdapter = require('./base-adapter');
const { ClusterError } = require('../errors');

class BooleanStateAdapter extends BaseClusterAdapter {
    constructor(cluster, options = {}) {
        super(cluster, {
            // Default options for boolean state devices
            outputOnChange: true,
            pollInterval: 0, // No polling by default for contact sensors
            ...options
        });
    }

    async initialize() {
        try {
            // Verify this is actually a BooleanStateCluster
            if (!this.cluster.getStateValueAttribute) {
                throw new Error('Cluster does not support BooleanState operations');
            }
            
            this.logger.info('BooleanStateAdapter initialized');
        } catch (error) {
            throw new ClusterError(
                `BooleanStateAdapter initialization failed: ${error.message}`,
                'ADAPTER_INIT_FAILED',
                { originalError: error.message }
            );
        }
    }

    async readState() {
        try {
            const stateValue = await this.cluster.getStateValueAttribute();
            const stateValueList = await this.cluster.getStateValueListAttribute();
            
            return {
                stateValue: stateValue,
                stateValueList: stateValueList,
                // Convert to human-readable format
                state: this.convertToHumanReadable(stateValue),
                raw: stateValue
            };
        } catch (error) {
            throw new ClusterError(
                `Failed to read BooleanState: ${error.message}`,
                'STATE_READ_FAILED',
                { originalError: error.message }
            );
        }
    }

    convertToHumanReadable(stateValue) {
        // Convert numeric state to human-readable format
        // This mapping may need to be adjusted based on specific device behavior
        switch (stateValue) {
            case 0:
                return 'closed';
            case 1:
                return 'open';
            default:
                return stateValue;
        }
    }

    async createSubscription(callback) {
        try {
            // Subscribe to state changes
            const subscription = await this.cluster.subscribeStateValueAttribute((value) => {
                const state = {
                    stateValue: value,
                    state: this.convertToHumanReadable(value),
                    raw: value,
                    timestamp: new Date().toISOString()
                };
                
                this.logger.debug(`BooleanState changed: ${state.state} (${value})`);
                callback(this.formatOutput(state));
            });

            return subscription;
        } catch (error) {
            throw new ClusterError(
                `Failed to create BooleanState subscription: ${error.message}`,
                'SUBSCRIPTION_CREATE_FAILED',
                { originalError: error.message }
            );
        }
    }

    formatOutput(state) {
        return {
            payload: state.state, // "open" or "closed"
            state: state.stateValue === 1, // boolean
            raw: state.stateValue, // numeric value
            topic: `matter/boolean-state/${this.cluster.id || 'unknown'}`,
            device: {
                nodeId: this.cluster.nodeId || 'unknown',
                type: 'contact',
                cluster: 'BooleanState'
            },
            timestamp: state.timestamp,
            cluster: 'BooleanState'
        };
    }

    // Utility method to check if device is in a specific state
    isOpen(state) {
        return state.stateValue === 1;
    }

    isClosed(state) {
        return state.stateValue === 0;
    }

    // Get device type based on state behavior
    getDeviceType() {
        return 'contact'; // Contact sensor is the most common boolean state device
    }

    // Get supported states
    getSupportedStates() {
        return ['open', 'closed'];
    }

    // Validate state value
    isValidState(stateValue) {
        return typeof stateValue === 'number' && (stateValue === 0 || stateValue === 1);
    }
}

module.exports = BooleanStateAdapter;
