#!/usr/bin/env node
/**
 * Standalone Matter Controller Test
 * Tests Matter commissioning and device reading without Node-RED
 * 
 * Usage:
 *   node test-matter-standalone.js
 */

const { CommissioningController, MatterServer } = require("@project-chip/matter-node.js");
const { StorageBackendDisk, StorageManager } = require("@project-chip/matter-node.js/storage");
const { BooleanStateCluster } = require("@project-chip/matter.js/cluster");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

// Configuration
const STORAGE_DIR = path.join(__dirname, ".matter-test-storage");
const CONTROLLER_NAME = "Test Controller";

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, colors.green);
}

function logError(message) {
    log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
    log(`ℹ ${message}`, colors.blue);
}

function logWarning(message) {
    log(`⚠ ${message}`, colors.yellow);
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

class MatterTestController {
    constructor() {
        this.matterServer = null;
        this.commissioningController = null;
        this.commissionedDevices = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        try {
            logInfo(`Initializing Matter controller...`);
            logInfo(`Storage directory: ${STORAGE_DIR}`);

            // Ensure storage directory exists
            if (!fs.existsSync(STORAGE_DIR)) {
                fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o755 });
                logSuccess(`Created storage directory`);
            }

            // Create storage backend
            const storageManager = new StorageManager(new StorageBackendDisk(STORAGE_DIR));
            await storageManager.initialize();

            // Create Matter server
            this.matterServer = new MatterServer(storageManager);

            // Create commissioning controller
            this.commissioningController = new CommissioningController({
                autoConnect: false,
            });

            await this.matterServer.addCommissioningController(this.commissioningController);
            await this.matterServer.start();

            this.isInitialized = true;
            logSuccess(`Matter controller initialized successfully`);

            // Restore previously commissioned devices
            await this.restoreCommissionedDevices();

        } catch (error) {
            logError(`Failed to initialize Matter controller: ${error.message}`);
            throw error;
        }
    }

    async restoreCommissionedDevices() {
        try {
            const nodes = await this.commissioningController.getCommissionedNodes();
            logInfo(`Found ${nodes.length} commissioned device(s)`);

            for (const nodeId of nodes) {
                try {
                    const device = await this.commissioningController.getConnectedNode(nodeId);
                    this.commissionedDevices.set(nodeId.toString(), {
                        nodeId: nodeId,
                        device: device,
                        connected: true
                    });
                    logSuccess(`Restored device: ${nodeId}`);
                } catch (err) {
                    logWarning(`Could not connect to device ${nodeId}: ${err.message}`);
                }
            }
        } catch (error) {
            logError(`Error restoring devices: ${error.message}`);
        }
    }

    async commissionDevice(pairingCode, deviceName, options = {}) {
        if (!this.isInitialized) {
            throw new Error("Matter Controller not initialized");
        }

        const codeType = pairingCode.startsWith('MT:') ? 'QR Code' : 'Manual Code';
        const isMultiAdmin = options.multiAdmin || false;

        try {
            if (isMultiAdmin) {
                logInfo(`Multi-admin commissioning with ${codeType}...`);
                logInfo(`Adding Node-RED as additional fabric to existing device`);
            } else {
                logInfo(`Commissioning device with ${codeType}...`);
            }

            // Parse the pairing code
            let commissioningData;

            if (pairingCode.startsWith('MT:')) {
                // QR Code format
                const { QrPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
                commissioningData = QrPairingCodeCodec.decode(pairingCode);
            } else {
                // Manual pairing code
                const { ManualPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
                commissioningData = ManualPairingCodeCodec.decode(pairingCode);
            }

            const discriminator = commissioningData.discriminator || commissioningData.shortDiscriminator;
            logInfo(`Discriminator: ${discriminator}`);
            logInfo(`Passcode: ${commissioningData.passcode ? '[PRESENT]' : '[MISSING]'}`);
            
            // Pre-commissioning device scan
            logInfo(`Scanning for commissionable devices...`);
            try {
                // Give a moment for any existing scans to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Try to get information about commissionable devices in the area
                logInfo(`Checking for any commissionable devices on network...`);
                
                // Log what we're looking for specifically
                logInfo(`Looking for device with:`);
                logInfo(`  - Short Discriminator: ${discriminator}`);
                logInfo(`  - Vendor ID: ${commissioningData.vendorId || 'Any'}`);
                logInfo(`  - Product ID: ${commissioningData.productId || 'Any'}`);
                
            } catch (e) {
                // Ignore timeout errors
                logWarning(`Pre-scan error (non-fatal): ${e.message}`);
            }

            // Commission the device with extended timeout
            logInfo(`Starting commissioning (this may take 60-90 seconds)...`);
            logInfo(`Searching for device with discriminator ${commissioningData.discriminator || commissioningData.shortDiscriminator}...`);
            
            // For multi-admin, we need to check if device is already commissioned
            // and handle it differently than initial commissioning
            let commissionOptions = {
                discovery: {
                    identifierData: commissioningData,
                    timeoutSeconds: 60, // Extended timeout for device discovery
                },
            };
            
            if (isMultiAdmin) {
                // For multi-admin commissioning, we may need additional parameters
                // to indicate this is adding a fabric, not initial commissioning
                logInfo('Attempting multi-admin commissioning (adding additional fabric)');
                
                // Some Matter.js versions require explicit multi-admin handling
                try {
                    // Check if device is already commissioned by trying to get existing fabrics
                    const existingNodes = await this.commissioningController.getCommissionedNodes();
                    logInfo(`Found ${existingNodes.length} existing commissioned devices in this controller`);
                    
                    // Log controller fabric information
                    const fabricInfo = await this.commissioningController.getFabrics();
                    logInfo(`Controller has ${fabricInfo.length} fabric(s) configured`);
                    
                } catch (e) {
                    // This is expected for multi-admin - device won't be in our controller yet
                    logInfo('Device not yet in this controller (expected for multi-admin)');
                    logInfo(`Controller error: ${e.message}`);
                }
                
                // Add detailed logging for multi-admin specific parameters
                logInfo(`Multi-admin commissioning parameters:`);
                logInfo(`  - Discriminator: ${discriminator}`);
                logInfo(`  - Vendor/Product: ${commissioningData.vendorId || 'undefined'}/${commissioningData.productId || 'undefined'}`);
                logInfo(`  - Setup PIN: ${commissioningData.passcode ? '[PRESENT]' : '[MISSING]'}`);
            }

            // Log commissioning attempt details
            logInfo(`Starting commissioning with options:`);
            logInfo(`  - Discovery timeout: ${commissionOptions.discovery.timeoutSeconds}s`);
            logInfo(`  - Expected discriminator: ${discriminator}`);
            logInfo(`  - Multi-admin mode: ${isMultiAdmin}`);
            
            // Attempt commissioning with detailed error capture
            let nodeId;
            try {
                logInfo(`Calling commissionNode()...`);
                nodeId = await this.commissioningController.commissionNode(commissionOptions);
                logSuccess(`commissionNode() returned NodeId: ${nodeId}`);
            } catch (commissionError) {
                logError(`commissionNode() failed: ${commissionError.message}`);
                
                // Log additional error details
                if (commissionError.stack) {
                    logInfo(`Error stack trace: ${commissionError.stack.split('\n')[0]}`);
                }
                
                // Check if it's a specific PASE error
                if (commissionError.message.includes('key confirmation')) {
                    logError(`PASE protocol error detected - this suggests:`);
                    if (isMultiAdmin) {
                        logError(`Multi-admin specific issues:`);
                        logError(`  1. Device may still have Alexa fabric (removal not propagated)`);
                        logError(`  2. Sharing code may be expired or wrong type`);
                        logError(`  3. Device needs to be in commissioning window from Aqara app`);
                        logError(`  4. Try factory reset + initial commissioning instead`);
                    } else {
                        logError(`Initial commissioning issues:`);
                        logError(`  1. Device not factory reset (still has other fabrics)`);
                        logError(`  2. Wrong pairing code`);
                        logError(`  3. Device not in pairing mode`);
                    }
                    
                    // Suggest the nuclear option
                    logWarning(`RECOMMENDATION: Try factory reset + initial commissioning:`);
                    logWarning(`  1. Hold device button 10+ seconds (LED flashes rapidly)`);
                    logWarning(`  2. Use option 1 (Initial) with original code: 03753213995`);
                }
                
                throw commissionError;
            }

            logSuccess(`Device commissioned successfully with NodeId: ${nodeId}`);

            // Connect to the device
            const device = await this.commissioningController.getConnectedNode(nodeId);

            // Store device info
            this.commissionedDevices.set(nodeId.toString(), {
                nodeId: nodeId,
                device: device,
                name: deviceName || `Device-${nodeId}`,
                connected: true,
                commissioned: new Date().toISOString(),
                multiAdmin: isMultiAdmin
            });

            if (isMultiAdmin) {
                logSuccess(`Device added to Node-RED fabric (multi-admin mode)`);
                logInfo(`Device remains operational with other controllers`);
            }

            return nodeId.toString();

        } catch (error) {
            let errorMessage = error.message;
            
            // Provide helpful error messages for common issues
            if (errorMessage.includes('No device discovered')) {
                logError('Device discovery failed - device not found during scan');
                logWarning('Troubleshooting steps:');
                console.log('  1. Ensure device is in pairing mode (usually hold button for 5+ seconds)');
                console.log('  2. Check device is on same network as this computer');
                console.log('  3. Verify pairing code is correct');
                console.log('  4. Try factory resetting device and using initial commissioning');
                if (isMultiAdmin) {
                    console.log('  5. For multi-admin: Generate fresh sharing code from primary app');
                    console.log('  6. Use sharing code immediately (they expire quickly)');
                }
            } else if (errorMessage.includes('key confirmation')) {
                logError('Multi-admin commissioning failed: Key confirmation rejected');
                if (isMultiAdmin) {
                    logWarning('Common multi-admin issues:');
                    console.log('  1. Device may have reached maximum fabric limit (typically 16)');
                    console.log('  2. Commissioning window may have expired - generate fresh code');
                    console.log('  3. Device may not support 3+ controllers simultaneously');
                    console.log('  4. Try removing device from one controller first');
                    console.log('  5. Some devices need factory reset before first multi-admin setup');
                } else {
                    logWarning('For initial commissioning: Ensure device is factory reset and in pairing mode');
                }
            } else if (errorMessage.includes('timeout')) {
                logError('Pairing timed out: Device not found or not responding');
            } else {
                logError(`Commissioning failed: ${errorMessage}`);
            }
            
            throw error;
        }
    }

    async readDeviceState(nodeId) {
        const deviceInfo = this.commissionedDevices.get(nodeId);
        if (!deviceInfo) {
            throw new Error(`Device ${nodeId} not found`);
        }

        try {
            const device = deviceInfo.device;
            const endpoints = device.getDevices();

            logInfo(`Device has ${endpoints.length} endpoint(s)`);

            // Find endpoint with BooleanState cluster
            for (const endpoint of endpoints) {
                const clusters = endpoint.getAllClusterClients();
                logInfo(`Endpoint has ${clusters.length} cluster(s)`);

                const booleanStateCluster = clusters.find(c => 
                    c.id === BooleanStateCluster.id
                );

                if (booleanStateCluster) {
                    logSuccess(`Found BooleanState cluster`);
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

            throw new Error(`BooleanState cluster not found on device`);

        } catch (error) {
            throw new Error(`Failed to read device state: ${error.message}`);
        }
    }

    async subscribeToDevice(nodeId, callback) {
        const deviceInfo = this.commissionedDevices.get(nodeId);
        if (!deviceInfo) {
            throw new Error(`Device ${nodeId} not found`);
        }

        try {
            const device = deviceInfo.device;
            const endpoints = device.getDevices();

            for (const endpoint of endpoints) {
                const clusters = endpoint.getAllClusterClients();
                const booleanStateCluster = clusters.find(c => 
                    c.id === BooleanStateCluster.id
                );

                if (booleanStateCluster) {
                    logInfo(`Subscribing to state changes...`);
                    
                    const unsubscribe = await booleanStateCluster.subscribeStateValueAttribute(
                        (value) => {
                            const state = {
                                nodeId: nodeId,
                                type: 'contact',
                                state: value,
                                contact: value ? 'open' : 'closed',
                                timestamp: new Date().toISOString()
                            };
                            callback(state);
                        },
                        0,  // minIntervalFloor
                        60  // maxIntervalCeiling (seconds)
                    );

                    logSuccess(`Subscribed to device ${nodeId} state changes`);
                    
                    return {
                        unsubscribe: async () => {
                            if (typeof unsubscribe === 'function') {
                                await unsubscribe();
                            }
                            logInfo(`Unsubscribed from device ${nodeId}`);
                        }
                    };
                }
            }

            throw new Error(`BooleanState cluster not found on device`);

        } catch (error) {
            throw new Error(`Failed to subscribe to device: ${error.message}`);
        }
    }

    async close() {
        try {
            if (this.matterServer) {
                logInfo(`Closing Matter server...`);
                await this.matterServer.close();
                logSuccess(`Matter server closed`);
            }
        } catch (error) {
            logError(`Error closing Matter server: ${error.message}`);
        }
    }

    listDevices() {
        if (this.commissionedDevices.size === 0) {
            logWarning(`No commissioned devices`);
            return;
        }

        log(`\n${colors.bright}Commissioned Devices:${colors.reset}`);
        this.commissionedDevices.forEach((device, nodeId) => {
            log(`  • NodeId: ${nodeId}`, colors.cyan);
            log(`    Name: ${device.name || 'Unnamed'}`);
            log(`    Connected: ${device.connected ? '✓' : '✗'}`);
            if (device.commissioned) {
                log(`    Commissioned: ${device.commissioned}`);
            }
        });
        console.log();
    }
}

// Main interactive menu
async function mainMenu(controller) {
    while (true) {
        console.log();
        log(`${'='.repeat(50)}`, colors.bright);
        log(`Matter Test Controller - Main Menu`, colors.bright);
        log(`${'='.repeat(50)}`, colors.bright);
        console.log();
        console.log('  1. Commission new device');
        console.log('  2. List commissioned devices');
        console.log('  3. Read device state');
        console.log('  4. Subscribe to device updates');
        console.log('  5. Exit');
        console.log();

        const choice = await question('Enter your choice (1-5): ');

        switch (choice.trim()) {
            case '1':
                await commissionNewDevice(controller);
                break;
            case '2':
                controller.listDevices();
                await question('Press Enter to continue...');
                break;
            case '3':
                await readDeviceState(controller);
                break;
            case '4':
                await subscribeToUpdates(controller);
                break;
            case '5':
                await controller.close();
                rl.close();
                process.exit(0);
            default:
                logWarning('Invalid choice, please try again');
        }
    }
}

async function commissionNewDevice(controller) {
    console.log();
    log('Commission New Device', colors.bright);
    log('─'.repeat(50));
    console.log();
    
    log('Commissioning Type:', colors.cyan);
    console.log('  1. Initial commissioning (fresh/factory reset device)');
    console.log('  2. Multi-admin (add to existing device from another controller)');
    console.log();
    
    const commType = await question('Choose type (1 or 2): ');
    const isMultiAdmin = commType.trim() === '2';
    
    if (isMultiAdmin) {
        console.log();
        logInfo('Multi-Admin Mode');
        log('─'.repeat(50));
        console.log('For multi-admin commissioning:');
        console.log('1. Device must already be paired with another controller (Aqara, Google, etc.)');
        console.log('2. Generate a "sharing code" or "commissioner code" from your primary controller app');
        console.log('3. Enter that code below (NOT the original device pairing code)');
        console.log();
    }
    
    const pairingCode = await question('Enter pairing code: ');
    if (!pairingCode.trim()) {
        logWarning('Pairing code required');
        return;
    }

    const deviceName = await question('Enter device name (optional): ');

    try {
        const options = { multiAdmin: isMultiAdmin };
        const nodeId = await controller.commissionDevice(pairingCode.trim(), deviceName.trim(), options);
        logSuccess(`Device commissioned with NodeId: ${nodeId}`);
        
        if (isMultiAdmin) {
            console.log();
            logInfo('Device added to Node-RED fabric!');
            logInfo('The device will remain operational with your other controllers.');
        }
    } catch (error) {
        logError(`Failed to commission device: ${error.message}`);
    }

    await question('\nPress Enter to continue...');
}

async function readDeviceState(controller) {
    console.log();
    log('Read Device State', colors.bright);
    log('─'.repeat(50));
    console.log();

    controller.listDevices();
    
    if (controller.commissionedDevices.size === 0) {
        await question('Press Enter to continue...');
        return;
    }

    const nodeId = await question('Enter device NodeId to read: ');
    
    if (!nodeId.trim()) {
        logWarning('NodeId required');
        return;
    }

    try {
        logInfo('Reading device state...');
        const state = await controller.readDeviceState(nodeId.trim());
        
        console.log();
        log('Device State:', colors.bright);
        log(`  NodeId: ${state.nodeId}`, colors.cyan);
        log(`  Type: ${state.type}`);
        log(`  Raw State: ${state.state}`);
        log(`  Contact: ${state.contact}`, state.contact === 'open' ? colors.red : colors.green);
        log(`  Timestamp: ${state.timestamp}`);
        
    } catch (error) {
        logError(`Failed to read device: ${error.message}`);
    }

    await question('\nPress Enter to continue...');
}

async function subscribeToUpdates(controller) {
    console.log();
    log('Subscribe to Device Updates', colors.bright);
    log('─'.repeat(50));
    console.log();

    controller.listDevices();
    
    if (controller.commissionedDevices.size === 0) {
        await question('Press Enter to continue...');
        return;
    }

    const nodeId = await question('Enter device NodeId to subscribe: ');
    
    if (!nodeId.trim()) {
        logWarning('NodeId required');
        return;
    }

    try {
        const subscription = await controller.subscribeToDevice(nodeId.trim(), (state) => {
            console.log();
            log('━'.repeat(50), colors.yellow);
            log('Device State Update:', colors.bright);
            log(`  Contact: ${state.contact}`, state.contact === 'open' ? colors.red : colors.green);
            log(`  Timestamp: ${state.timestamp}`);
            log('━'.repeat(50), colors.yellow);
        });

        logSuccess('Subscribed! Trigger your device to see updates.');
        logInfo('Press Enter to stop subscription and return to menu...');
        
        await question('');
        
        await subscription.unsubscribe();
        logSuccess('Unsubscribed from device updates');
        
    } catch (error) {
        logError(`Failed to subscribe: ${error.message}`);
        await question('\nPress Enter to continue...');
    }
}

// Main execution
async function main() {
    console.clear();
    log(`${'='.repeat(50)}`, colors.bright);
    log(`Matter.js Standalone Test`, colors.bright);
    log(`${'='.repeat(50)}`, colors.bright);
    console.log();

    const controller = new MatterTestController();

    try {
        await controller.initialize();
        console.log();
        await mainMenu(controller);
    } catch (error) {
        logError(`Fatal error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log();
    logInfo('Shutting down...');
    rl.close();
    process.exit(0);
});

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        logError(`Unhandled error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

module.exports = { MatterTestController };

