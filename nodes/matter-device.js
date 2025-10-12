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
        let subscriptionHandle = null;
        let retryCount = 0;
        const MAX_RETRIES = 30; // 30 seconds timeout
        
        // Wait for controller to initialize
        function waitForController() {
            if (node.controller.isInitialized) {
                retryCount = 0; // Reset on success
                initializeDevice();
            } else if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(waitForController, 1000);
            } else {
                node.status({ fill: "red", shape: "ring", text: "controller timeout" });
                node.error("Controller failed to initialize within 30 seconds. Check controller configuration and deploy status.");
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
                // Store the subscription handle for cleanup
                subscriptionHandle = await node.controller.subscribeToDevice(
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
                subscriptionHandle = null;
                // Continue even if subscription fails - polling can still work
            }
        }
        
        let errorCount = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        
        async function pollDevice() {
            try {
                const state = await node.controller.readDeviceState(
                    node.deviceId,
                    node.deviceType
                );
                
                // Reset error count on successful read
                errorCount = 0;
                
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
                errorCount++;
                
                if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
                    node.error(`Device ${node.deviceId} appears offline after ${errorCount} failed attempts: ${error.message}`);
                    node.status({ fill: "red", shape: "ring", text: "device offline" });
                    
                    // Stop aggressive polling if device is offline
                    if (pollTimer && node.pollInterval < 60) {
                        clearInterval(pollTimer);
                        // Switch to slower polling (every 60 seconds)
                        pollTimer = setInterval(pollDevice, 60000);
                        node.warn("Switched to reduced polling rate due to errors");
                    }
                } else {
                    node.warn(`Failed to read device state (attempt ${errorCount}/${MAX_CONSECUTIVE_ERRORS}): ${error.message}`);
                    node.status({ fill: "yellow", shape: "ring", text: `retry ${errorCount}` });
                }
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
        node.on('close', async function(done) {
            const closeTimeout = setTimeout(() => {
                node.warn("Device node close operation timed out");
                done();
            }, 3000);
            
            try {
                // Clear polling timer
                if (pollTimer) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                }
                
                // Unsubscribe from device updates
                if (subscriptionHandle && node.controller) {
                    try {
                        if (typeof subscriptionHandle.unsubscribe === 'function') {
                            await subscriptionHandle.unsubscribe();
                        }
                    } catch (err) {
                        node.warn(`Failed to unsubscribe: ${err.message}`);
                    }
                }
                
                clearTimeout(closeTimeout);
                done();
            } catch (error) {
                clearTimeout(closeTimeout);
                node.error(`Error during close: ${error.message}`);
                done();
            }
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

