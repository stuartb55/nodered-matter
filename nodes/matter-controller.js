module.exports = function(RED) {
    const { CommissioningController, MatterServer } = require("@project-chip/matter-node.js");
    const { StorageBackendDisk, StorageManager } = require("@project-chip/matter-node.js/storage");
    const { VendorId } = require("@project-chip/matter-node.js/datatype");
    const { CommissioningOptions } = require("@project-chip/matter.js/protocol");
    const { BooleanStateCluster, ContactSensorTypeEnum } = require("@project-chip/matter.js/cluster");
    const path = require("path");
    const os = require("os");

    function MatterControllerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.name = config.name;
        node.commissionedDevices = new Map(); // Store commissioned devices
        node.deviceStates = new Map(); // Store current device states
        node.isInitialized = false;
        
        // Storage path in Node-RED user directory
        const storageDir = path.join(RED.settings.userDir || os.homedir(), ".node-red-matter");
        
        console.log(`[Matter] Creating controller node with ID: ${node.id}, Name: ${node.name}`);
        node.log(`Initializing Matter Controller with storage: ${storageDir}`);
        
        // Initialize Matter controller
        async function initMatterController() {
            try {
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
        
        // Commission a new device using pairing code
        node.commissionDevice = async function(pairingCode, deviceName) {
            if (!node.isInitialized) {
                throw new Error("Matter Controller not initialized");
            }
            
            try {
                node.log(`Commissioning device with code: ${pairingCode}`);
                node.status({ fill: "yellow", shape: "ring", text: "commissioning..." });
                
                // Commission the device
                const nodeId = await node.commissioningController.commissionNode({
                    discovery: {
                        knownAddress: undefined,
                        identifierData: {
                            setupPin: undefined, // Will be derived from pairing code
                            longDiscriminator: undefined,
                        },
                    },
                    passcode: pairingCode,
                });
                
                node.log(`Device commissioned successfully with NodeId: ${nodeId}`);
                
                // Connect to the device
                const device = await node.commissioningController.getConnectedNode(nodeId);
                
                // Store device info
                node.commissionedDevices.set(nodeId.toString(), {
                    nodeId: nodeId,
                    device: device,
                    name: deviceName || `Device-${nodeId}`,
                    connected: true,
                    commissioned: new Date().toISOString()
                });
                
                node.status({ fill: "green", shape: "dot", text: "connected" });
                
                return {
                    success: true,
                    nodeId: nodeId.toString(),
                    message: "Device commissioned successfully"
                };
                
            } catch (error) {
                node.status({ fill: "green", shape: "dot", text: "connected" });
                throw new Error(`Commissioning failed: ${error.message}`);
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
                            await booleanStateCluster.subscribeStateValueAttribute(
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
                            return true;
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
        console.log("[Matter] Commission request for node ID:", req.params.id);
        const node = RED.nodes.getNode(req.params.id);
        console.log("[Matter] Found node:", node ? "YES" : "NO");
        if (!node) {
            console.log("[Matter] ERROR: Controller node not found for ID:", req.params.id);
            res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
            return;
        }
        
        const { pairingCode, deviceName } = req.body;
        if (!pairingCode) {
            res.status(400).json({ error: "Pairing code is required" });
            return;
        }
        
        try {
            const result = await node.commissionDevice(pairingCode, deviceName);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    RED.httpAdmin.get("/matter-controller/:id/devices", RED.auth.needsPermission('matter-controller.read'), function(req, res) {
        console.log("[Matter] Devices request for node ID:", req.params.id);
        const node = RED.nodes.getNode(req.params.id);
        console.log("[Matter] Found node:", node ? "YES - initialized: " + node.isInitialized : "NO");
        if (!node) {
            console.log("[Matter] ERROR: Controller node not found for ID:", req.params.id);
            res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
            return;
        }
        
        const devices = node.getDevices();
        res.json({ devices, initialized: node.isInitialized });
    });
};

