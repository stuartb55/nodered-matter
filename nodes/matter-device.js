module.exports = function(RED) {
    function MatterDeviceNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.controller = RED.nodes.getNode(config.controller);
        node.deviceId = config.device;
        node.deviceType = config.deviceType || 'contact';
        node.outputOnChange = config.outputOnChange !== false;
        node.pollInterval = parseInt(config.pollInterval) || 0;
        
        if (!node.controller) {
            node.status({ fill: "red", shape: "ring", text: "no controller" });
            node.error("Matter controller not configured");
            return;
        }
        
        node.status({ fill: "yellow", shape: "ring", text: "initializing" });
        
        let pollTimer = null;
        let isSubscribed = false;
        
        // Wait for controller to initialize
        function waitForController() {
            if (node.controller.isInitialized) {
                initializeDevice();
            } else {
                setTimeout(waitForController, 1000);
            }
        }
        
        async function initializeDevice() {
            if (!node.deviceId) {
                node.status({ fill: "yellow", shape: "ring", text: "no device selected" });
                return;
            }
            
            try {
                const device = node.controller.getDevice(node.deviceId);
                if (!device) {
                    node.status({ fill: "red", shape: "ring", text: "device not found" });
                    node.error(`Device ${node.deviceId} not found`);
                    return;
                }
                
                // Subscribe to device state changes if enabled
                if (node.outputOnChange) {
                    await subscribeToDevice();
                }
                
                // Set up polling if interval is specified
                if (node.pollInterval > 0) {
                    pollTimer = setInterval(pollDevice, node.pollInterval * 1000);
                }
                
                // Initial state read
                await pollDevice();
                
                node.status({ fill: "green", shape: "dot", text: "ready" });
                
            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error(`Failed to initialize device: ${error.message}`);
            }
        }
        
        async function subscribeToDevice() {
            try {
                await node.controller.subscribeToDevice(
                    node.deviceId,
                    node.deviceType,
                    (state) => {
                        // Update status
                        updateStatus(state);
                        
                        // Send message
                        node.send({
                            payload: state.contact,
                            state: state.state,
                            topic: `matter/${node.deviceId}`,
                            device: {
                                nodeId: node.deviceId,
                                type: node.deviceType
                            },
                            timestamp: state.timestamp
                        });
                    }
                );
                
                isSubscribed = true;
                node.log(`Subscribed to device ${node.deviceId}`);
                
            } catch (error) {
                node.warn(`Failed to subscribe to device: ${error.message}`);
                // Continue even if subscription fails - polling can still work
            }
        }
        
        async function pollDevice() {
            try {
                const state = await node.controller.readDeviceState(
                    node.deviceId,
                    node.deviceType
                );
                
                // Update status
                updateStatus(state);
                
                // Send message (only if not using subscription, or as initial read)
                if (!isSubscribed || !pollTimer) {
                    node.send({
                        payload: state.contact,
                        state: state.state,
                        topic: `matter/${node.deviceId}`,
                        device: {
                            nodeId: node.deviceId,
                            type: node.deviceType
                        },
                        timestamp: state.timestamp
                    });
                }
                
            } catch (error) {
                node.error(`Failed to read device state: ${error.message}`);
                node.status({ fill: "red", shape: "ring", text: "read error" });
            }
        }
        
        function updateStatus(state) {
            if (node.deviceType === 'contact') {
                const statusText = state.contact;
                const statusColor = state.contact === 'closed' ? 'green' : 'blue';
                node.status({ 
                    fill: statusColor, 
                    shape: "dot", 
                    text: statusText 
                });
            }
        }
        
        // Handle input messages - trigger a read on demand
        node.on('input', async function(msg) {
            try {
                await pollDevice();
            } catch (error) {
                node.error(`Failed to read device on input: ${error.message}`);
            }
        });
        
        // Cleanup on close
        node.on('close', function(done) {
            if (pollTimer) {
                clearInterval(pollTimer);
            }
            done();
        });
        
        // Start initialization
        waitForController();
    }
    
    RED.nodes.registerType("matter-device", MatterDeviceNode);
    
    // HTTP endpoint to get available devices for dropdown
    RED.httpAdmin.get("/matter-controller/:id/device-list", RED.auth.needsPermission('matter-device.read'), function(req, res) {
        const controller = RED.nodes.getNode(req.params.id);
        if (!controller) {
            res.status(404).json({ error: "Controller not found" });
            return;
        }
        
        const devices = controller.getDevices();
        res.json(devices);
    });
};

