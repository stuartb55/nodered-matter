/**
 * Level Control Cluster Adapter
 * Handles dimmers, volume controls, and other level-based devices
 */

const BaseClusterAdapter = require('./base-adapter');
const { ClusterError } = require('../errors');

class LevelControlAdapter extends BaseClusterAdapter {
    constructor(cluster, options = {}) {
        super(cluster, {
            // Default options for level control devices
            outputOnChange: true,
            pollInterval: 10, // 10 second polling for dimmers
            minLevel: 0,
            maxLevel: 254,
            ...options
        });
    }

    async initialize() {
        try {
            // Verify this is actually a LevelControlCluster
            if (!this.cluster.getCurrentLevelAttribute) {
                throw new Error('Cluster does not support LevelControl operations');
            }
            
            // Get min/max levels
            try {
                this.options.minLevel = await this.cluster.getMinLevelAttribute() || 0;
                this.options.maxLevel = await this.cluster.getMaxLevelAttribute() || 254;
            } catch (error) {
                this.logger.warn(`Could not read min/max levels, using defaults: ${error.message}`);
            }
            
            this.logger.info(`LevelControlAdapter initialized (range: ${this.options.minLevel}-${this.options.maxLevel})`);
        } catch (error) {
            throw new ClusterError(
                `LevelControlAdapter initialization failed: ${error.message}`,
                'ADAPTER_INIT_FAILED',
                { originalError: error.message }
            );
        }
    }

    async readState() {
        try {
            const currentLevel = await this.cluster.getCurrentLevelAttribute();
            const minLevel = this.options.minLevel;
            const maxLevel = this.options.maxLevel;
            
            // Convert to percentage
            const percentage = this.levelToPercentage(currentLevel, minLevel, maxLevel);
            
            return {
                currentLevel: currentLevel,
                percentage: percentage,
                minLevel: minLevel,
                maxLevel: maxLevel,
                state: percentage,
                raw: currentLevel
            };
        } catch (error) {
            throw new ClusterError(
                `Failed to read LevelControl state: ${error.message}`,
                'STATE_READ_FAILED',
                { originalError: error.message }
            );
        }
    }

    async createSubscription(callback) {
        try {
            // Subscribe to level changes
            const subscription = await this.cluster.subscribeCurrentLevelAttribute((value) => {
                const percentage = this.levelToPercentage(value, this.options.minLevel, this.options.maxLevel);
                const state = {
                    currentLevel: value,
                    percentage: percentage,
                    state: percentage,
                    raw: value,
                    timestamp: new Date().toISOString()
                };
                
                this.logger.debug(`LevelControl changed: ${percentage}% (${value})`);
                callback(this.formatOutput(state));
            });

            return subscription;
        } catch (error) {
            throw new ClusterError(
                `Failed to create LevelControl subscription: ${error.message}`,
                'SUBSCRIPTION_CREATE_FAILED',
                { originalError: error.message }
            );
        }
    }

    async setLevel(level) {
        try {
            // Convert percentage to raw level if needed
            const rawLevel = this.percentageToLevel(level);
            
            await this.cluster.moveToLevel({
                level: rawLevel,
                transitionTime: 0 // Immediate transition
            });
            
            this.logger.info(`Level set to ${level}% (${rawLevel})`);
        } catch (error) {
            throw new ClusterError(
                `Failed to set level: ${error.message}`,
                'SET_LEVEL_FAILED',
                { level, originalError: error.message }
            );
        }
    }

    async increaseLevel(step = 10) {
        try {
            const currentState = await this.readState();
            const newPercentage = Math.min(100, currentState.percentage + step);
            await this.setLevel(newPercentage);
        } catch (error) {
            throw new ClusterError(
                `Failed to increase level: ${error.message}`,
                'INCREASE_LEVEL_FAILED',
                { step, originalError: error.message }
            );
        }
    }

    async decreaseLevel(step = 10) {
        try {
            const currentState = await this.readState();
            const newPercentage = Math.max(0, currentState.percentage - step);
            await this.setLevel(newPercentage);
        } catch (error) {
            throw new ClusterError(
                `Failed to decrease level: ${error.message}`,
                'DECREASE_LEVEL_FAILED',
                { step, originalError: error.message }
            );
        }
    }

    levelToPercentage(level, minLevel, maxLevel) {
        if (level <= minLevel) return 0;
        if (level >= maxLevel) return 100;
        
        return Math.round(((level - minLevel) / (maxLevel - minLevel)) * 100);
    }

    percentageToLevel(percentage) {
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        return Math.round(this.options.minLevel + 
            (clampedPercentage / 100) * (this.options.maxLevel - this.options.minLevel));
    }

    formatOutput(state) {
        return {
            payload: state.percentage, // percentage (0-100)
            state: state.percentage, // percentage
            raw: state.currentLevel, // raw level value
            percentage: state.percentage,
            level: state.currentLevel,
            topic: `matter/level-control/${this.cluster.id || 'unknown'}`,
            device: {
                nodeId: this.cluster.nodeId || 'unknown',
                type: 'dimmer',
                cluster: 'LevelControl'
            },
            timestamp: state.timestamp,
            cluster: 'LevelControl'
        };
    }

    // Utility methods
    isOn(state) {
        return state.percentage > 0;
    }

    isOff(state) {
        return state.percentage === 0;
    }

    getDeviceType() {
        return 'dimmer';
    }

    getSupportedStates() {
        return Array.from({ length: 101 }, (_, i) => i); // 0-100%
    }

    isValidLevel(level) {
        return typeof level === 'number' && level >= 0 && level <= 100;
    }

    getLevelRange() {
        return {
            min: this.options.minLevel,
            max: this.options.maxLevel,
            minPercentage: 0,
            maxPercentage: 100
        };
    }
}

module.exports = LevelControlAdapter;
