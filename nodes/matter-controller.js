module.exports = function(RED) {
    const { CommissioningController, MatterServer } = require("@project-chip/matter-node.js");
    const { StorageBackendDisk, StorageManager } = require("@project-chip/matter-node.js/storage");
    const { VendorId } = require("@project-chip/matter-node.js/datatype");
    const { CommissioningOptions } = require("@project-chip/matter.js/protocol");
    const { BooleanStateCluster, ContactSensorTypeEnum } = require("@project-chip/matter.js/cluster");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    function MatterControllerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.name = config.name;
        node.commissionedDevices = new Map(); // Store commissioned devices
        node.deviceStates = new Map(); // Store current device states
        node.isInitialized = false;
        
        // Storage path in Node-RED user directory
        const storageDir = path.join(RED.settings.userDir || os.homedir(), ".node-red-matter");
        
        node.log(`Creating controller node with ID: ${node.id}, Name: ${node.name}`);
        node.log(`Initializing Matter Controller with storage: ${storageDir}`);
        
        // Initialize Matter controller
        async function initMatterController() {
            try {
                // Ensure storage directory exists
                try {
                    if (!fs.existsSync(storageDir)) {
                        fs.mkdirSync(storageDir, { recursive: true, mode: 0o755 });
                        node.log(`Created storage directory: ${storageDir}`);
                    }
                } catch (fsError) {
                    node.error(`Failed to create storage directory: ${fsError.message}`);
                    node.status({ fill: "red", shape: "ring", text: "storage error" });
                    return;
                }
                
                // Create storage backend
                const storageManager = new StorageManager(new StorageBackendDisk(storageDir));
                await storageManager.initialize();
                
                // Create Matter server
                node.matterServer = new MatterServer(storageManager);
                
                // Create commissioning controller
                node.commissioningController = new CommissioningController({
                    autoConnect: false,
                });
                
                await node.matterServer.addCommissioningController(node.commissioningController);
                await node.matterServer.start();
                
                node.isInitialized = true;
                node.status({ fill: "green", shape: "dot", text: "connected" });
                node.log("Matter Controller initialized successfully");
                
                // Restore previously commissioned devices
                await restoreCommissionedDevices();
                
            } catch (error) {
                node.error(`Failed to initialize Matter Controller: ${error.message}`);
                node.status({ fill: "red", shape: "ring", text: "error" });
            }
        }
        
        // Restore commissioned devices from storage
        async function restoreCommissionedDevices() {
            try {
                const nodes = await node.commissioningController.getCommissionedNodes();
                node.log(`Found ${nodes.length} commissioned device(s)`);
                
                for (const nodeId of nodes) {
                    try {
                        const device = await node.commissioningController.getConnectedNode(nodeId);
                        node.commissionedDevices.set(nodeId.toString(), {
                            nodeId: nodeId,
                            device: device,
                            connected: true
                        });
                        node.log(`Restored device: ${nodeId}`);
                    } catch (err) {
                        node.warn(`Could not connect to device ${nodeId}: ${err.message}`);
                    }
                }
            } catch (error) {
                node.error(`Error restoring devices: ${error.message}`);
            }
        }
        
        // Commission a new device using pairing code (supports both initial and multi-admin)
        node.commissionDevice = async function(pairingCode, deviceName, options = {}) {
            if (!node.isInitialized) {
                throw new Error("Matter Controller not initialized");
            }
            
            try {
                // Don't log the actual pairing code for security
                const codeType = pairingCode.startsWith('MT:') ? 'QR Code' : 'Manual Code';
                const isMultiAdmin = options.multiAdmin || false;
                
                node.log(`${isMultiAdmin ? 'Multi-admin commissioning' : 'Commissioning'} device with ${codeType} (code length: ${pairingCode.length})`);
                node.status({ fill: "yellow", shape: "ring", text: isMultiAdmin ? "adding fabric..." : "commissioning..." });
                
                // Parse the pairing code - could be QR code or manual code
                let commissioningData;
                
                if (pairingCode.startsWith('MT:')) {
                    // QR Code format
                    const { QrPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
                    commissioningData = QrPairingCodeCodec.decode(pairingCode);
                } else {
                    // Manual pairing code (11 digits)
                    const { ManualPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
                    commissioningData = ManualPairingCodeCodec.decode(pairingCode);
                }
                
                // Only log non-sensitive parts of commissioning data
                const discriminator = commissioningData.discriminator || commissioningData.shortDiscriminator;
                node.log(`Commissioning data parsed successfully (discriminator: ${discriminator})`);
                
                // Prepare commissioning options
                const commissionOptions = {
                    discovery: {
                        identifierData: commissioningData,
                    },
                };
                
                // For multi-admin, we may need to specify additional options
                // Matter.js handles this automatically, but we log it for clarity
                if (isMultiAdmin) {
                    node.log('Multi-admin mode: Adding Node-RED as additional fabric to existing device');
                }
                
                // Commission the device using parsed data
                // This works for both initial and multi-admin commissioning
                // Matter.js will detect if device is already commissioned and handle accordingly
                const nodeId = await node.commissioningController.commissionNode(commissionOptions);
                
                node.log(`Device commissioned successfully with NodeId: ${nodeId}`);
                
                // Connect to the device
                const device = await node.commissioningController.getConnectedNode(nodeId);
                
                // Get fabric information to confirm multi-admin setup
                let fabricInfo = null;
                try {
                    const endpoints = device.getDevices();
                    if (endpoints.length > 0) {
                        // Try to get fabric count from operational credentials cluster
                        const clusters = endpoints[0].getAllClusterClients();
                        node.log(`Device has ${endpoints.length} endpoint(s) with ${clusters.length} cluster(s)`);
                    }
                } catch (err) {
                    node.warn(`Could not read fabric information: ${err.message}`);
                }
                
                // Store device info
                node.commissionedDevices.set(nodeId.toString(), {
                    nodeId: nodeId,
                    device: device,
                    name: deviceName || `Device-${nodeId}`,
                    connected: true,
                    commissioned: new Date().toISOString(),
                    multiAdmin: isMultiAdmin,
                    fabricInfo: fabricInfo
                });
                
                node.status({ fill: "green", shape: "dot", text: "connected" });
                
                return {
                    success: true,
                    nodeId: nodeId.toString(),
                    message: isMultiAdmin ? 
                        "Device added to Node-RED fabric (multi-admin)" : 
                        "Device commissioned successfully",
                    multiAdmin: isMultiAdmin
                };
                
            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "commission failed" });
                
                // Provide more helpful error messages for common multi-admin issues
                let errorMessage = error.message;
                
                if (errorMessage.includes('key confirmation')) {
                    errorMessage = 'Pairing failed: Incorrect pairing code or device not in pairing mode. ' +
                                 'For multi-admin: Ensure you have the commissioner code from the primary controller.';
                } else if (errorMessage.includes('timeout')) {
                    errorMessage = 'Pairing timed out: Device not found or not responding. ' +
                                 'Ensure device is powered on and in pairing mode.';
                } else if (errorMessage.includes('already commissioned')) {
                    errorMessage = 'Device already commissioned to this controller. ' +
                                 'For multi-admin: Use the sharing code from the device\'s primary controller.';
                }
                
                node.error(`Commissioning failed: ${errorMessage}`);
                throw new Error(errorMessage);
            }
        };
        
        // Get device by nodeId
        node.getDevice = function(nodeId) {
            return node.commissionedDevices.get(nodeId);
        };
        
        // Get all commissioned devices
        node.getDevices = function() {
            const devices = [];
            node.commissionedDevices.forEach((device, nodeId) => {
                devices.push({
                    nodeId: nodeId,
                    name: device.name,
                    connected: device.connected,
                    commissioned: device.commissioned
                });
            });
            return devices;
        };
        
        // Read device state
        node.readDeviceState = async function(nodeId, clusterId) {
            const deviceInfo = node.commissionedDevices.get(nodeId);
            if (!deviceInfo) {
                throw new Error(`Device ${nodeId} not found`);
            }
            
            try {
                const device = deviceInfo.device;
                
                // For contact sensors, read BooleanState cluster
                if (clusterId === 'contact' || clusterId === 'booleanState') {
                    const endpoints = device.getDevices();
                    
                    // Find endpoint with BooleanState cluster
                    for (const endpoint of endpoints) {
                        const clusters = endpoint.getAllClusterClients();
                        const booleanStateCluster = clusters.find(c => 
                            c.id === BooleanStateCluster.id
                        );
                        
                        if (booleanStateCluster) {
                            const state = await booleanStateCluster.getStateValueAttribute();
                            return {
                                nodeId: nodeId,
                                type: 'contact',
                                state: state,
                                contact: state ? 'open' : 'closed',
                                timestamp: new Date().toISOString()
                            };
                        }
                    }
                }
                
                throw new Error(`Cluster ${clusterId} not found on device`);
                
            } catch (error) {
                throw new Error(`Failed to read device state: ${error.message}`);
            }
        };
        
        // Subscribe to device state changes
        node.subscribeToDevice = async function(nodeId, clusterId, callback) {
            const deviceInfo = node.commissionedDevices.get(nodeId);
            if (!deviceInfo) {
                throw new Error(`Device ${nodeId} not found`);
            }
            
            try {
                const device = deviceInfo.device;
                
                if (clusterId === 'contact' || clusterId === 'booleanState') {
                    const endpoints = device.getDevices();
                    
                    for (const endpoint of endpoints) {
                        const clusters = endpoint.getAllClusterClients();
                        const booleanStateCluster = clusters.find(c => 
                            c.id === BooleanStateCluster.id
                        );
                        
                        if (booleanStateCluster) {
                            // Subscribe to state changes
                            const unsubscribe = await booleanStateCluster.subscribeStateValueAttribute(
                                (value) => {
                                    const state = {
                                        nodeId: nodeId,
                                        type: 'contact',
                                        state: value,
                                        contact: value ? 'open' : 'closed',
                                        timestamp: new Date().toISOString()
                                    };
                                    
                                    node.deviceStates.set(nodeId, state);
                                    callback(state);
                                },
                                0, // minIntervalFloor
                                60 // maxIntervalCeiling (seconds)
                            );
                            
                            node.log(`Subscribed to device ${nodeId} state changes`);
                            
                            // Return an object with unsubscribe method
                            return {
                                unsubscribe: async () => {
                                    try {
                                        if (typeof unsubscribe === 'function') {
                                            await unsubscribe();
                                        }
                                        node.log(`Unsubscribed from device ${nodeId}`);
                                    } catch (err) {
                                        node.warn(`Error unsubscribing from device ${nodeId}: ${err.message}`);
                                    }
                                }
                            };
                        }
                    }
                }
                
                throw new Error(`Cluster ${clusterId} not found on device`);
                
            } catch (error) {
                throw new Error(`Failed to subscribe to device: ${error.message}`);
            }
        };
        
        // Cleanup on close
        node.on('close', async function(done) {
            try {
                if (node.matterServer) {
                    await node.matterServer.close();
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
        RED.log.info(`[Matter] Found node: ${node ? "YES" : "NO"}`);
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
                details: "Expected QR code starting with 'MT:' or 11-digit manual pairing code"
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
            res.status(500).json({ error: error.message });
        }
    });
    
    RED.httpAdmin.get("/matter-controller/:id/devices", RED.auth.needsPermission('matter-controller.read'), function(req, res) {
        RED.log.info(`[Matter] Devices request for node ID: ${req.params.id}`);
        const node = RED.nodes.getNode(req.params.id);
        RED.log.info(`[Matter] Found node: ${node ? "YES - initialized: " + node.isInitialized : "NO"}`);
        if (!node) {
            RED.log.error(`[Matter] ERROR: Controller node not found for ID: ${req.params.id}`);
            res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
            return;
        }
        
        const devices = node.getDevices();
        res.json({ devices, initialized: node.isInitialized });
    });
};

