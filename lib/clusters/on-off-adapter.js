/**
 * On/Off Cluster Adapter
 * Handles switches, lights, and other on/off devices
 */

const BaseClusterAdapter = require('./base-adapter');
const { ClusterError } = require('../errors');

class OnOffAdapter extends BaseClusterAdapter {
    constructor(cluster, options = {}) {
        super(cluster, {
            // Default options for on/off devices
            outputOnChange: true,
            pollInterval: 5, // 5 second polling for switches
            ...options
        });
    }

    async initialize() {
        try {
            // Verify this is actually an OnOffCluster
            if (!this.cluster.getOnOffAttribute) {
                throw new Error('Cluster does not support OnOff operations');
            }
            
            this.logger.info('OnOffAdapter initialized');
        } catch (error) {
            throw new ClusterError(
                `OnOffAdapter initialization failed: ${error.message}`,
                'ADAPTER_INIT_FAILED',
                { originalError: error.message }
            );
        }
    }

    async readState() {
        try {
            const onOff = await this.cluster.getOnOffAttribute();
            
            return {
                onOff: onOff,
                state: onOff ? 'on' : 'off',
                raw: onOff
            };
        } catch (error) {
            throw new ClusterError(
                `Failed to read OnOff state: ${error.message}`,
                'STATE_READ_FAILED',
                { originalError: error.message }
            );
        }
    }

    async createSubscription(callback) {
        try {
            // Subscribe to on/off changes
            const subscription = await this.cluster.subscribeOnOffAttribute((value) => {
                const state = {
                    onOff: value,
                    state: value ? 'on' : 'off',
                    raw: value,
                    timestamp: new Date().toISOString()
                };
                
                this.logger.debug(`OnOff changed: ${state.state} (${value})`);
                callback(this.formatOutput(state));
            });

            return subscription;
        } catch (error) {
            throw new ClusterError(
                `Failed to create OnOff subscription: ${error.message}`,
                'SUBSCRIPTION_CREATE_FAILED',
                { originalError: error.message }
            );
        }
    }

    async turnOn() {
        try {
            await this.cluster.toggle();
            this.logger.info('Device turned on');
        } catch (error) {
            throw new ClusterError(
                `Failed to turn on device: ${error.message}`,
                'TURN_ON_FAILED',
                { originalError: error.message }
            );
        }
    }

    async turnOff() {
        try {
            await this.cluster.toggle();
            this.logger.info('Device turned off');
        } catch (error) {
            throw new ClusterError(
                `Failed to turn off device: ${error.message}`,
                'TURN_OFF_FAILED',
                { originalError: error.message }
            );
        }
    }

    async toggle() {
        try {
            await this.cluster.toggle();
            this.logger.info('Device toggled');
        } catch (error) {
            throw new ClusterError(
                `Failed to toggle device: ${error.message}`,
                'TOGGLE_FAILED',
                { originalError: error.message }
            );
        }
    }

    formatOutput(state) {
        return {
            payload: state.state, // "on" or "off"
            state: state.onOff, // boolean
            raw: state.onOff, // boolean
            topic: `matter/on-off/${this.cluster.id || 'unknown'}`,
            device: {
                nodeId: this.cluster.nodeId || 'unknown',
                type: 'switch',
                cluster: 'OnOff'
            },
            timestamp: state.timestamp,
            cluster: 'OnOff'
        };
    }

    // Utility methods
    isOn(state) {
        return state.onOff === true;
    }

    isOff(state) {
        return state.onOff === false;
    }

    getDeviceType() {
        return 'switch';
    }

    getSupportedStates() {
        return ['on', 'off'];
    }

    isValidState(stateValue) {
        return typeof stateValue === 'boolean';
    }
}

module.exports = OnOffAdapter;
