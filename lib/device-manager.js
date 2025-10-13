/**
 * Device Manager
 * Handles device registry, state management, and cluster detection
 */

const { DeviceNotFoundError, ClusterError, NetworkError } = require('./errors');

class DeviceManager {
    constructor(matterService, options = {}) {
        this.matterService = matterService;
        this.devices = new Map(); // nodeId -> device info
        this.deviceStates = new Map(); // nodeId -> current state
        this.subscriptions = new Map(); // nodeId -> subscription info
        this.options = {
            autoRestore: true,
            healthCheckInterval: 30000, // 30 seconds
            connectionTimeout: 10000, // 10 seconds
            ...options
        };
        this.logger = options.logger || console;
        this.healthCheckTimer = null;
    }

    async initialize() {
        if (this.options.autoRestore) {
            await this.restoreCommissionedDevices();
        }
        
        this.startHealthCheck();
        this.logger.info('DeviceManager initialized');
    }

    async restoreCommissionedDevices() {
        try {
            const controller = this.matterService.getCommissioningController();
            const nodes = await controller.getCommissionedNodes();
            
            this.logger.info(`Found ${nodes.length} commissioned device(s) to restore`);
            
            for (const nodeId of nodes) {
                try {
                    await this.restoreDevice(nodeId);
                } catch (error) {
                    this.logger.warn(`Could not restore device ${nodeId}: ${error.message}`);
                    
                    // Remove unavailable device from storage
                    try {
                        await controller.removeNode(nodeId);
                        this.logger.info(`Removed unavailable device ${nodeId} from storage`);
                    } catch (removeError) {
                        this.logger.warn(`Could not remove device ${nodeId}: ${removeError.message}`);
                    }
                }
            }
            
        } catch (error) {
            this.logger.error(`Error restoring devices: ${error.message}`);
            throw new NetworkError(`Device restoration failed: ${error.message}`, 'RESTORE_FAILED', {
                originalError: error.message
            });
        }
    }

    async restoreDevice(nodeId) {
        const controller = this.matterService.getCommissioningController();
        
        try {
            const device = await controller.getConnectedNode(nodeId);
            
            // Detect device capabilities
            const capabilities = await this.detectDeviceCapabilities(device);
            
            const deviceInfo = {
                nodeId: nodeId,
                device: device,
                name: `Device-${nodeId}`,
                connected: true,
                commissioned: new Date().toISOString(),
                restored: true,
                capabilities: capabilities,
                vendorId: null, // We don't have this info for restored devices
                productId: null,
                lastSeen: new Date().toISOString()
            };
            
            this.devices.set(nodeId.toString(), deviceInfo);
            this.logger.info(`Restored device: ${nodeId} (${capabilities.clusters.join(', ')})`);
            
            return deviceInfo;
            
        } catch (error) {
            throw new DeviceNotFoundError(
                `Device ${nodeId} not available for restoration`,
                'DEVICE_RESTORE_FAILED',
                { nodeId, originalError: error.message }
            );
        }
    }

    async addDevice(nodeId, device, deviceName, commissioningData = {}) {
        try {
            const capabilities = await this.detectDeviceCapabilities(device);
            
            const deviceInfo = {
                nodeId: nodeId,
                device: device,
                name: deviceName || `Device-${nodeId}`,
                connected: true,
                commissioned: new Date().toISOString(),
                restored: false,
                capabilities: capabilities,
                vendorId: commissioningData.vendorId || null,
                productId: commissioningData.productId || null,
                lastSeen: new Date().toISOString()
            };
            
            this.devices.set(nodeId.toString(), deviceInfo);
            this.logger.info(`Added device: ${nodeId} (${deviceName}) - ${capabilities.clusters.join(', ')}`);
            
            return deviceInfo;
            
        } catch (error) {
            throw new DeviceNotFoundError(
                `Failed to add device ${nodeId}`,
                'DEVICE_ADD_FAILED',
                { nodeId, originalError: error.message }
            );
        }
    }

    async detectDeviceCapabilities(device) {
        try {
            const endpoints = device.getDevices();
            const capabilities = {
                clusters: [],
                endpoints: [],
                deviceTypes: []
            };
            
            for (const endpoint of endpoints) {
                const endpointInfo = {
                    id: endpoint.id,
                    clusters: []
                };
                
                const clusters = endpoint.getAllClusterClients();
                for (const cluster of clusters) {
                    const clusterName = cluster.constructor.name;
                    capabilities.clusters.push(clusterName);
                    endpointInfo.clusters.push(clusterName);
                }
                
                capabilities.endpoints.push(endpointInfo);
            }
            
            // Remove duplicates
            capabilities.clusters = [...new Set(capabilities.clusters)];
            
            return capabilities;
            
        } catch (error) {
            this.logger.warn(`Could not detect device capabilities: ${error.message}`);
            return {
                clusters: ['Unknown'],
                endpoints: [],
                deviceTypes: []
            };
        }
    }

    getDevice(nodeId) {
        const deviceInfo = this.devices.get(nodeId.toString());
        if (!deviceInfo) {
            throw new DeviceNotFoundError(`Device ${nodeId} not found`, 'DEVICE_NOT_FOUND', { nodeId });
        }
        return deviceInfo;
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    getDevicesByCapability(capability) {
        return this.getAllDevices().filter(device => 
            device.capabilities.clusters.includes(capability)
        );
    }

    async getDeviceState(nodeId) {
        const deviceInfo = this.getDevice(nodeId);
        
        try {
            const state = await this.readDeviceState(deviceInfo);
            this.deviceStates.set(nodeId.toString(), state);
            deviceInfo.lastSeen = new Date().toISOString();
            
            return state;
            
        } catch (error) {
            this.logger.warn(`Could not read state for device ${nodeId}: ${error.message}`);
            throw new ClusterError(
                `Failed to read device state: ${error.message}`,
                'STATE_READ_FAILED',
                { nodeId, originalError: error.message }
            );
        }
    }

    async readDeviceState(deviceInfo) {
        const state = {
            nodeId: deviceInfo.nodeId,
            timestamp: new Date().toISOString(),
            clusters: {}
        };
        
        try {
            const endpoints = deviceInfo.device.getDevices();
            
            for (const endpoint of endpoints) {
                const clusters = endpoint.getAllClusterClients();
                
                for (const cluster of clusters) {
                    const clusterName = cluster.constructor.name;
                    
                    try {
                        // Read cluster-specific state
                        const clusterState = await this.readClusterState(cluster);
                        state.clusters[clusterName] = clusterState;
                    } catch (error) {
                        this.logger.warn(`Could not read ${clusterName} state: ${error.message}`);
                        state.clusters[clusterName] = { error: error.message };
                    }
                }
            }
            
        } catch (error) {
            throw new ClusterError(
                `Failed to read device state: ${error.message}`,
                'DEVICE_STATE_READ_FAILED',
                { nodeId: deviceInfo.nodeId, originalError: error.message }
            );
        }
        
        return state;
    }

    async readClusterState(cluster) {
        const clusterName = cluster.constructor.name;
        
        try {
            switch (clusterName) {
                case 'BooleanStateCluster':
                    return {
                        stateValue: await cluster.getStateValueAttribute(),
                        stateValueList: await cluster.getStateValueListAttribute()
                    };
                    
                case 'OnOffCluster':
                    return {
                        onOff: await cluster.getOnOffAttribute()
                    };
                    
                case 'LevelControlCluster':
                    return {
                        currentLevel: await cluster.getCurrentLevelAttribute(),
                        minLevel: await cluster.getMinLevelAttribute(),
                        maxLevel: await cluster.getMaxLevelAttribute()
                    };
                    
                default:
                    // Generic cluster reading
                    return {
                        clusterType: clusterName,
                        available: true
                    };
            }
        } catch (error) {
            throw new ClusterError(
                `Failed to read ${clusterName} state: ${error.message}`,
                'CLUSTER_STATE_READ_FAILED',
                { clusterName, originalError: error.message }
            );
        }
    }

    async subscribeToDevice(nodeId, callback) {
        const deviceInfo = this.getDevice(nodeId);
        
        try {
            // Subscribe to relevant clusters based on device capabilities
            const subscriptions = [];
            
            for (const clusterName of deviceInfo.capabilities.clusters) {
                const subscription = await this.subscribeToCluster(deviceInfo.device, clusterName, callback);
                subscriptions.push(subscription);
            }
            
            this.subscriptions.set(nodeId.toString(), {
                subscriptions: subscriptions,
                callback: callback,
                createdAt: new Date().toISOString()
            });
            
            this.logger.info(`Subscribed to device ${nodeId} (${deviceInfo.capabilities.clusters.join(', ')})`);
            
        } catch (error) {
            throw new ClusterError(
                `Failed to subscribe to device ${nodeId}: ${error.message}`,
                'SUBSCRIPTION_FAILED',
                { nodeId, originalError: error.message }
            );
        }
    }

    async subscribeToCluster(device, clusterName, callback) {
        // This is a simplified subscription - in practice, you'd need to implement
        // proper cluster-specific subscription logic
        return {
            clusterName: clusterName,
            device: device,
            callback: callback
        };
    }

    async unsubscribeFromDevice(nodeId) {
        const subscription = this.subscriptions.get(nodeId.toString());
        if (subscription) {
            // Clean up subscriptions
            this.subscriptions.delete(nodeId.toString());
            this.logger.info(`Unsubscribed from device ${nodeId}`);
        }
    }

    async removeDevice(nodeId) {
        try {
            await this.unsubscribeFromDevice(nodeId);
            
            const controller = this.matterService.getCommissioningController();
            await controller.removeNode(nodeId);
            
            this.devices.delete(nodeId.toString());
            this.deviceStates.delete(nodeId.toString());
            
            this.logger.info(`Removed device ${nodeId}`);
            
        } catch (error) {
            throw new DeviceNotFoundError(
                `Failed to remove device ${nodeId}: ${error.message}`,
                'DEVICE_REMOVE_FAILED',
                { nodeId, originalError: error.message }
            );
        }
    }

    startHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        this.healthCheckTimer = setInterval(async () => {
            await this.performHealthCheck();
        }, this.options.healthCheckInterval);
        
        this.logger.info(`Health check started (interval: ${this.options.healthCheckInterval}ms)`);
    }

    async performHealthCheck() {
        const devices = this.getAllDevices();
        
        for (const deviceInfo of devices) {
            try {
                // Check if device is still connected
                await this.getDeviceState(deviceInfo.nodeId);
            } catch (error) {
                this.logger.warn(`Device ${deviceInfo.nodeId} health check failed: ${error.message}`);
                deviceInfo.connected = false;
            }
        }
    }

    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
            this.logger.info('Health check stopped');
        }
    }

    getDeviceStats() {
        const devices = this.getAllDevices();
        const stats = {
            total: devices.length,
            connected: devices.filter(d => d.connected).length,
            restored: devices.filter(d => d.restored).length,
            byCapability: {},
            byVendor: {}
        };
        
        // Group by capability
        for (const device of devices) {
            for (const cluster of device.capabilities.clusters) {
                stats.byCapability[cluster] = (stats.byCapability[cluster] || 0) + 1;
            }
            
            if (device.vendorId) {
                stats.byVendor[device.vendorId] = (stats.byVendor[device.vendorId] || 0) + 1;
            }
        }
        
        return stats;
    }

    async close() {
        this.stopHealthCheck();
        
        // Clean up all subscriptions
        for (const nodeId of this.subscriptions.keys()) {
            await this.unsubscribeFromDevice(nodeId);
        }
        
        this.logger.info('DeviceManager closed');
    }
}

module.exports = DeviceManager;
