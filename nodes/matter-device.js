/**
 * Refactored Matter Device Node
 * Uses cluster adapters for better device type support and cleaner code
 */

module.exports = function(RED) {
    const ClusterAdapterFactory = require("../lib/clusters");
    const { DeviceNotFoundError, ClusterError } = require("../lib/errors");

    function MatterDeviceNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.controller = RED.nodes.getNode(config.controller);
        node.deviceId = config.device;
        node.deviceType = config.deviceType || 'auto'; // 'auto' will detect device type
        node.outputOnChange = config.outputOnChange !== false;
        node.pollInterval = parseInt(config.pollInterval) || 0;
        
        if (!node.controller) {
            node.status({ fill: "red", shape: "ring", text: "no controller" });
            node.error("Matter controller not configured");
            return;
        }
        
        node.status({ fill: "yellow", shape: "ring", text: "initializing" });
        
        // Device management
        let deviceInfo = null;
        let clusterAdapter = null;
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
                // Get device info from controller
                deviceInfo = node.controller.getDevice(node.deviceId);
                if (!deviceInfo) {
                    node.status({ fill: "red", shape: "ring", text: "device not found" });
                    node.error(`Device ${node.deviceId} not found`);
                    return;
                }
                
                // Auto-detect device type if not specified
                if (node.deviceType === 'auto') {
                    node.deviceType = detectDeviceType(deviceInfo);
                    node.log(`Auto-detected device type: ${node.deviceType}`);
                }
                
                // Create appropriate cluster adapter
                clusterAdapter = await createClusterAdapter(deviceInfo, node.deviceType);
                
                // Initialize the adapter
                await clusterAdapter.initialize();
                
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
                node.log(`Device ${node.deviceId} initialized with ${clusterAdapter.getClusterType()}`);
                
            } catch (error) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                node.error(`Failed to initialize device: ${error.message}`);
            }
        }
        
        function detectDeviceType(deviceInfo) {
            const capabilities = deviceInfo.capabilities || { clusters: [] };
            
            // Check for specific cluster types to determine device type
            if (capabilities.clusters.includes('BooleanStateCluster')) {
                return 'contact';
            } else if (capabilities.clusters.includes('OnOffCluster')) {
                return 'switch';
            } else if (capabilities.clusters.includes('LevelControlCluster')) {
                return 'dimmer';
            }
            
            // Default to contact sensor if unknown
            return 'contact';
        }
        
        async function createClusterAdapter(deviceInfo, deviceType) {
            try {
                const device = deviceInfo.device;
                const endpoints = device.getDevices();
                
                // Find the appropriate cluster based on device type
                let targetCluster = null;
                
                for (const endpoint of endpoints) {
                    const clusters = endpoint.getAllClusterClients();
                    
                    switch (deviceType) {
                        case 'contact':
                            targetCluster = clusters.find(c => c.constructor.name === 'BooleanStateCluster');
                            break;
                        case 'switch':
                            targetCluster = clusters.find(c => c.constructor.name === 'OnOffCluster');
                            break;
                        case 'dimmer':
                            targetCluster = clusters.find(c => c.constructor.name === 'LevelControlCluster');
                            break;
                        default:
                            // Try to find any supported cluster
                            targetCluster = clusters.find(c => 
                                ClusterAdapterFactory.isClusterSupported(c.constructor.name)
                            );
                    }
                    
                    if (targetCluster) {
                        break;
                    }
                }
                
                if (!targetCluster) {
                    throw new Error(`No supported cluster found for device type: ${deviceType}`);
                }
                
                // Create adapter with node-specific options
                const adapterOptions = {
                    outputOnChange: node.outputOnChange,
                    pollInterval: node.pollInterval,
                    logger: {
                        info: (msg) => node.log(msg),
                        warn: (msg) => node.warn(msg),
                        error: (msg) => node.error(msg),
                        debug: (msg) => node.debug(msg)
                    }
                };
                
                return ClusterAdapterFactory.createAdapter(targetCluster, adapterOptions);
                
            } catch (error) {
                throw new ClusterError(
                    `Failed to create cluster adapter: ${error.message}`,
                    'ADAPTER_CREATE_FAILED',
                    { deviceType, originalError: error.message }
                );
            }
        }
        
        async function subscribeToDevice() {
            try {
                if (!clusterAdapter) {
                    throw new Error("Cluster adapter not initialized");
                }
                
                // Subscribe using the cluster adapter
                await clusterAdapter.subscribe((state) => {
                    // Update status
                    updateStatus(state);
                    
                    // Send message with adapter-formatted output
                    node.send(state);
                });
                
                isSubscribed = true;
                node.log(`Subscribed to device ${node.deviceId} using ${clusterAdapter.getClusterType()}`);
                
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
                if (!clusterAdapter) {
                    throw new Error("Cluster adapter not initialized");
                }
                
                // Read state using the cluster adapter
                const state = await clusterAdapter.readState();
                
                // Reset error count on successful read
                errorCount = 0;
                
                // Update status
                updateStatus(state);
                
                // Format and send message (only if not using subscription, or as initial read)
                if (!isSubscribed || !pollTimer) {
                    const formattedOutput = clusterAdapter.formatOutput(state);
                    node.send(formattedOutput);
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
            if (!state) return;
            
            // Update status based on device type and state
            let statusText = '';
            let statusColor = 'green';
            
            switch (node.deviceType) {
                case 'contact':
                    statusText = state.state || state.contact || 'unknown';
                    statusColor = (state.state === 'closed' || state.state === false) ? 'green' : 'blue';
                    break;
                    
                case 'switch':
                    statusText = state.state || (state.onOff ? 'on' : 'off');
                    statusColor = (state.state === 'on' || state.onOff) ? 'green' : 'gray';
                    break;
                    
                case 'dimmer':
                    statusText = `${state.percentage || state.state || 0}%`;
                    statusColor = (state.percentage > 0 || state.state > 0) ? 'green' : 'gray';
                    break;
                    
                default:
                    statusText = 'ready';
                    statusColor = 'green';
            }
            
            node.status({ 
                fill: statusColor, 
                shape: "dot", 
                text: statusText 
            });
        }
        
        // Handle input messages - trigger a read on demand
        node.on('input', async function(msg) {
            try {
                // If it's a command message, try to execute it
                if (msg.payload && typeof msg.payload === 'object') {
                    await handleCommand(msg.payload);
                } else {
                    // Otherwise, just poll the device
                    await pollDevice();
                }
            } catch (error) {
                node.error(`Failed to handle input: ${error.message}`);
            }
        });
        
        async function handleCommand(command) {
            if (!clusterAdapter) {
                throw new Error("Cluster adapter not initialized");
            }
            
            try {
                switch (command.action) {
                    case 'turnOn':
                        if (clusterAdapter.turnOn) {
                            await clusterAdapter.turnOn();
                        }
                        break;
                        
                    case 'turnOff':
                        if (clusterAdapter.turnOff) {
                            await clusterAdapter.turnOff();
                        }
                        break;
                        
                    case 'toggle':
                        if (clusterAdapter.toggle) {
                            await clusterAdapter.toggle();
                        }
                        break;
                        
                    case 'setLevel':
                        if (clusterAdapter.setLevel && command.level !== undefined) {
                            await clusterAdapter.setLevel(command.level);
                        }
                        break;
                        
                    default:
                        node.warn(`Unknown command: ${command.action}`);
                }
                
                // Read state after command execution
                await pollDevice();
                
            } catch (error) {
                throw new Error(`Command execution failed: ${error.message}`);
            }
        }
        
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
                
                // Close cluster adapter
                if (clusterAdapter) {
                    await clusterAdapter.close();
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
        
        // Add device type information for each device
        const devicesWithTypes = devices.map(device => ({
            ...device,
            suggestedType: suggestDeviceType(device.capabilities)
        }));
        
        res.json(devicesWithTypes);
    });
    
    function suggestDeviceType(capabilities) {
        if (!capabilities || !capabilities.clusters) {
            return 'contact';
        }
        
        const clusters = capabilities.clusters;
        
        if (clusters.includes('BooleanStateCluster')) {
            return 'contact';
        } else if (clusters.includes('OnOffCluster')) {
            return 'switch';
        } else if (clusters.includes('LevelControlCluster')) {
            return 'dimmer';
        }
        
        return 'contact'; // Default
    }
};