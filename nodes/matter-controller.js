/**
 * Refactored Matter Controller Node
 * Uses the new service layer architecture for better separation of concerns
 */

module.exports = function(RED) {
    const path = require("path");
    const os = require("os");
    
    // Import our new service layer
    const MatterService = require("../lib/matter-service");
    const CommissioningService = require("../lib/commissioning-service");
    const DeviceManager = require("../lib/device-manager");
    const { CommissioningError, ValidationError } = require("../lib/errors");

    function MatterControllerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.name = config.name;
        node.isInitialized = false;
        
        // Service layer instances
        node.matterService = null;
        node.commissioningService = null;
        node.deviceManager = null;
        
        // Storage path in Node-RED user directory
        const storageDir = path.join(RED.settings.userDir || os.homedir(), ".node-red-matter");
        
        node.log(`Creating controller node with ID: ${node.id}, Name: ${node.name}`);
        node.log(`Initializing Matter Controller with storage: ${storageDir}`);
        
        // Initialize Matter controller using service layer
        async function initMatterController() {
            try {
                node.status({ fill: "yellow", shape: "ring", text: "initializing..." });
                
                // Create MatterService with proper configuration
                node.matterService = new MatterService({
                    storageDir: storageDir,
                    controllerName: node.name || 'Node-RED Matter Controller',
                    autoConnect: false,
                    mdns: {
                        enableIpv4: true,
                        enableIpv6: true,
                        multicastInterface: 'auto'
                    },
                    logger: {
                        info: (msg) => node.log(msg),
                        warn: (msg) => node.warn(msg),
                        error: (msg) => node.error(msg),
                        debug: (msg) => node.debug(msg)
                    }
                });
                
                // Initialize MatterService
                await node.matterService.initialize();
                
                // Create CommissioningService
                node.commissioningService = new CommissioningService(node.matterService, {
                    logger: {
                        info: (msg) => node.log(msg),
                        warn: (msg) => node.warn(msg),
                        error: (msg) => node.error(msg),
                        debug: (msg) => node.debug(msg)
                    }
                });
                
                // Create DeviceManager
                node.deviceManager = new DeviceManager(node.matterService, {
                    autoRestore: true,
                    logger: {
                        info: (msg) => node.log(msg),
                        warn: (msg) => node.warn(msg),
                        error: (msg) => node.error(msg),
                        debug: (msg) => node.debug(msg)
                    }
                });
                
                // Initialize DeviceManager (this will restore devices)
                await node.deviceManager.initialize();
                
                node.isInitialized = true;
                node.status({ fill: "green", shape: "dot", text: "connected" });
                node.log("Matter Controller initialized successfully");
                
            } catch (error) {
                node.error(`Failed to initialize Matter Controller: ${error.message}`);
                node.status({ fill: "red", shape: "ring", text: "error" });
                
                // Provide specific error guidance
                if (error instanceof CommissioningError) {
                    node.error(`Commissioning error: ${error.message}`);
                } else if (error instanceof ValidationError) {
                    node.error(`Configuration error: ${error.message}`);
                }
            }
        }
        
        // Commission a new device using the CommissioningService
        node.commissionDevice = async function(pairingCode, deviceName, options = {}) {
            if (!node.isInitialized) {
                throw new Error("Matter Controller not initialized");
            }
            
            try {
                node.status({ fill: "yellow", shape: "ring", text: options.multiAdmin ? "adding fabric..." : "commissioning..." });
                
                // Use CommissioningService for commissioning
                const result = await node.commissioningService.commissionDevice(pairingCode, deviceName, options);
                
                // Add device to DeviceManager
                const controller = node.matterService.getCommissioningController();
                const device = await controller.getConnectedNode(result.nodeId);
                
                await node.deviceManager.addDevice(result.nodeId, device, deviceName, result.commissioningData);
                
                node.status({ fill: "green", shape: "dot", text: "connected" });
                
                return result;
                
            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "commission failed" });
                
                // Enhanced error handling using our error types
                if (error instanceof CommissioningError) {
                    node.error(`Commissioning failed: ${error.message}`);
                    throw error;
                } else if (error instanceof ValidationError) {
                    node.error(`Validation error: ${error.message}`);
                    throw error;
                } else {
                    node.error(`Unexpected error: ${error.message}`);
                    throw new Error(`Commissioning failed: ${error.message}`);
                }
            }
        };
        
        // Get device by nodeId using DeviceManager
        node.getDevice = function(nodeId) {
            if (!node.isInitialized) {
                throw new Error("Matter Controller not initialized");
            }
            return node.deviceManager.getDevice(nodeId);
        };
        
        // Get all commissioned devices using DeviceManager
        node.getDevices = function() {
            if (!node.isInitialized) {
                return [];
            }
            return node.deviceManager.getAllDevices().map(device => ({
                nodeId: device.nodeId,
                name: device.name,
                connected: device.connected,
                commissioned: device.commissioned,
                capabilities: device.capabilities.clusters,
                vendorId: device.vendorId,
                productId: device.productId
            }));
        };

        // Check if controller is dealing with Thread devices
        node.isThreadEnvironment = function() {
            if (!node.isInitialized) {
                return false;
            }
            
            const devices = node.deviceManager.getAllDevices();
            return devices.some(device => device.vendorId === 4447); // Aqara vendor ID
        };

        // Get Thread-specific guidance for commissioned devices
        node.getThreadGuidance = function() {
            if (!node.isThreadEnvironment()) {
                return { threadDetected: false };
            }
            
            return {
                threadDetected: true,
                message: "Thread devices detected. Ensure Aqara M100 hub is operational and Thread network is active.",
                recommendations: [
                    "Check Aqara app for M100 hub status",
                    "Ensure Thread network is operational", 
                    "Verify device is in range of Thread Border Router",
                    "Consider factory reset if multi-admin issues persist"
                ]
            };
        };
        
        // Read device state using DeviceManager
        node.readDeviceState = async function(nodeId, clusterId) {
            if (!node.isInitialized) {
                throw new Error("Matter Controller not initialized");
            }
            
            try {
                const state = await node.deviceManager.getDeviceState(nodeId);
                
                // Return cluster-specific state if requested
                if (clusterId && state.clusters[clusterId]) {
                    return {
                        nodeId: nodeId,
                        cluster: clusterId,
                        state: state.clusters[clusterId],
                        timestamp: state.timestamp
                    };
                }
                
                return state;
                
            } catch (error) {
                throw new Error(`Failed to read device state: ${error.message}`);
            }
        };
        
        // Subscribe to device state changes using DeviceManager
        node.subscribeToDevice = async function(nodeId, clusterId, callback) {
            if (!node.isInitialized) {
                throw new Error("Matter Controller not initialized");
            }
            
            try {
                await node.deviceManager.subscribeToDevice(nodeId, callback);
                
                node.log(`Subscribed to device ${nodeId} state changes`);
                
                // Return unsubscribe function
                return {
                    unsubscribe: async () => {
                        try {
                            await node.deviceManager.unsubscribeFromDevice(nodeId);
                            node.log(`Unsubscribed from device ${nodeId}`);
                        } catch (err) {
                            node.warn(`Error unsubscribing from device ${nodeId}: ${err.message}`);
                        }
                    }
                };
                
            } catch (error) {
                throw new Error(`Failed to subscribe to device: ${error.message}`);
            }
        };

        // Get device statistics
        node.getDeviceStats = function() {
            if (!node.isInitialized) {
                return { total: 0, connected: 0, restored: 0 };
            }
            return node.deviceManager.getDeviceStats();
        };

        // Health check
        node.healthCheck = async function() {
            if (!node.isInitialized) {
                return { status: 'not_initialized', healthy: false };
            }
            
            try {
                const matterHealth = await node.matterService.healthCheck();
                const deviceStats = node.getDeviceStats();
                
                return {
                    ...matterHealth,
                    deviceStats: deviceStats,
                    threadEnvironment: node.isThreadEnvironment()
                };
            } catch (error) {
                return { 
                    status: 'unhealthy', 
                    healthy: false, 
                    error: error.message 
                };
            }
        };
        
        // Cleanup on close
        node.on('close', async function(done) {
            try {
                if (node.deviceManager) {
                    await node.deviceManager.close();
                }
                
                if (node.matterService) {
                    await node.matterService.close();
                }
                
                node.log("Matter Controller closed");
                done();
            } catch (error) {
                node.error(`Error closing Matter Controller: ${error.message}`);
                done();
            }
        });
        
        // Initialize the controller
        initMatterController();
    }
    
    RED.nodes.registerType("matter-controller", MatterControllerNode);
    
    // HTTP endpoints for device management
    RED.httpAdmin.post("/matter-controller/:id/commission", RED.auth.needsPermission('matter-controller.write'), async function(req, res) {
        RED.log.info(`[Matter] Commission request for node ID: ${req.params.id}`);
        const node = RED.nodes.getNode(req.params.id);
        
        if (!node) {
            RED.log.error(`[Matter] ERROR: Controller node not found for ID: ${req.params.id}`);
            res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
            return;
        }
        
        const { pairingCode, deviceName, multiAdmin } = req.body;
        
        // Validate pairing code presence
        if (!pairingCode) {
            res.status(400).json({ error: "Pairing code is required" });
            return;
        }
        
        // Validate pairing code format
        const sanitizedCode = pairingCode.trim();
        const isQRCode = sanitizedCode.startsWith('MT:');
        const isManualCode = /^\d{8,11}(-\d{4,8})?$/.test(sanitizedCode.replace(/-/g, ''));
        
        if (!isQRCode && !isManualCode) {
            res.status(400).json({ 
                error: "Invalid pairing code format",
                details: "Expected QR code starting with 'MT:' or 8-11 digit manual pairing code"
            });
            return;
        }
        
        // Log commissioning type
        if (multiAdmin) {
            RED.log.info('[Matter] Multi-admin commissioning requested (adding additional fabric)');
        }
        
        try {
            const options = { multiAdmin: multiAdmin || false };
            const result = await node.commissionDevice(sanitizedCode, deviceName, options);
            res.json(result);
        } catch (error) {
            // Return structured error information
            const errorResponse = {
                error: error.message,
                type: error.constructor.name,
                code: error.code || 'UNKNOWN_ERROR'
            };
            
            if (error.details) {
                errorResponse.details = error.details;
            }
            
            res.status(500).json(errorResponse);
        }
    });
    
    RED.httpAdmin.get("/matter-controller/:id/devices", RED.auth.needsPermission('matter-controller.read'), function(req, res) {
        RED.log.info(`[Matter] Devices request for node ID: ${req.params.id}`);
        const node = RED.nodes.getNode(req.params.id);
        
        if (!node) {
            RED.log.error(`[Matter] ERROR: Controller node not found for ID: ${req.params.id}`);
            res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
            return;
        }
        
        const devices = node.getDevices();
        const stats = node.getDeviceStats();
        
        res.json({ 
            devices, 
            initialized: node.isInitialized,
            stats: stats,
            threadEnvironment: node.isThreadEnvironment()
        });
    });

    // Health check endpoint
    RED.httpAdmin.get("/matter-controller/:id/health", RED.auth.needsPermission('matter-controller.read'), async function(req, res) {
        const node = RED.nodes.getNode(req.params.id);
        
        if (!node) {
            res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
            return;
        }
        
        try {
            const health = await node.healthCheck();
            res.json(health);
        } catch (error) {
            res.status(500).json({ 
                status: 'error', 
                healthy: false, 
                error: error.message 
            });
        }
    });
};