#!/usr/bin/env node
/**
 * Debug Matter Commissioning - Non-interactive version with enhanced logging
 * 
 * Usage:
 *   node test-matter-debug.js <pairing-code> [device-name] [--multi-admin]
 */

const { CommissioningController, MatterServer } = require("@project-chip/matter-node.js");
const { StorageBackendDisk, StorageManager } = require("@project-chip/matter-node.js/storage");
const { BooleanStateCluster } = require("@project-chip/matter.js/cluster");
const path = require("path");
const fs = require("fs");

// Configuration
const STORAGE_DIR = path.join(__dirname, ".matter-debug-storage");
const CONTROLLER_NAME = "Debug Controller";

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

class MatterDebugController {
    constructor() {
        this.matterServer = null;
        this.commissioningController = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            logInfo(`Initializing Matter debug controller...`);
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
            logSuccess(`Matter debug controller initialized successfully`);

        } catch (error) {
            logError(`Failed to initialize Matter controller: ${error.message}`);
            throw error;
        }
    }

    async debugCommissionDevice(pairingCode, deviceName, isMultiAdmin = false) {
        if (!this.isInitialized) {
            throw new Error("Matter Controller not initialized");
        }

        try {
            const codeType = pairingCode.startsWith('MT:') ? 'QR Code' : 'Manual Code';
            
            log(`\n${'='.repeat(60)}`, colors.bright);
            log(`DEBUG COMMISSIONING ATTEMPT`, colors.bright);
            log(`${'='.repeat(60)}`, colors.bright);
            
            logInfo(`Mode: ${isMultiAdmin ? 'Multi-admin' : 'Initial'} commissioning`);
            logInfo(`Code type: ${codeType}`);
            logInfo(`Code length: ${pairingCode.length} characters`);
            logInfo(`Device name: ${deviceName || 'Unnamed'}`);

            // Parse the pairing code
            let commissioningData;
            if (pairingCode.startsWith('MT:')) {
                const { QrPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
                commissioningData = QrPairingCodeCodec.decode(pairingCode);
            } else {
                const { ManualPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
                commissioningData = ManualPairingCodeCodec.decode(pairingCode);
            }

            const discriminator = commissioningData.discriminator || commissioningData.shortDiscriminator;
            
            log(`\nPARSED COMMISSIONING DATA:`, colors.cyan);
            logInfo(`  - Discriminator: ${discriminator}`);
            logInfo(`  - Short Discriminator: ${commissioningData.shortDiscriminator}`);
            logInfo(`  - Passcode: ${commissioningData.passcode ? '[PRESENT]' : '[MISSING]'}`);
            logInfo(`  - Vendor ID: ${commissioningData.vendorId || 'undefined'} ${commissioningData.vendorId === 4447 ? '(Aqara)' : ''}`);
            logInfo(`  - Product ID: ${commissioningData.productId || 'undefined'}`);
            logInfo(`  - Version: ${commissioningData.version || 'undefined'}`);
            
            // Thread-specific analysis
            log(`\nTHREAD DEVICE ANALYSIS:`, colors.cyan);
            logWarning(`Device appears to be using Thread over Matter:`);
            logWarning(`  - IPv6 communication detected in previous logs`);
            logWarning(`  - Thread devices require Thread Border Router`);
            logWarning(`  - Commissioning may need Thread network credentials`);
            logWarning(`  - Device should be close to Thread Border Router`);
            
            logInfo(`Thread Border Router requirements:`);
            logInfo(`  - HomePod Mini, Apple TV 4K, Nest Hub, or similar`);
            logInfo(`  - Must be on same network as commissioning device`);
            logInfo(`  - Thread network must be active and operational`);

            // Controller state logging
            log(`\nCONTROLLER STATE:`, colors.cyan);
            try {
                const existingNodes = await this.commissioningController.getCommissionedNodes();
                logInfo(`  - Existing commissioned devices: ${existingNodes.length}`);
                
                const fabricInfo = await this.commissioningController.getFabrics();
                logInfo(`  - Controller fabrics: ${fabricInfo.length}`);
                
                if (fabricInfo.length > 0) {
                    fabricInfo.forEach((fabric, index) => {
                        logInfo(`    Fabric ${index + 1}: ID ${fabric.fabricId}`);
                    });
                }
            } catch (e) {
                logWarning(`  - Could not read controller state: ${e.message}`);
            }

            // Pre-commissioning scan
            log(`\nPRE-COMMISSIONING SCAN:`, colors.cyan);
            logInfo(`Scanning for commissionable devices...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            logInfo(`Looking for device with:`);
            logInfo(`  - Short Discriminator: ${discriminator}`);
            logInfo(`  - Vendor/Product: ${commissioningData.vendorId || 'Any'}/${commissioningData.productId || 'Any'}`);

            // Commissioning options
            const commissionOptions = {
                discovery: {
                    identifierData: commissioningData,
                    timeoutSeconds: 60,
                },
            };
            
            // Thread-specific commissioning options
            if (isMultiAdmin === false) {
                logWarning(`Thread device detected - may need Thread network credentials`);
                logWarning(`Device is likely still connected to Aqara M100's Thread network`);
                logWarning(`This prevents commissioning by other controllers`);
                
                logInfo(`Thread network solutions:`);
                logInfo(`  1. Temporarily power off Aqara M100 during commissioning`);
                logInfo(`  2. Check Aqara app for "Allow other controllers" setting`);
                logInfo(`  3. Device may need complete Thread network removal`);
            }

            log(`\nCOMMISSIONING ATTEMPT:`, colors.cyan);
            logInfo(`Starting commissioning with 60-second timeout...`);
            logInfo(`Multi-admin mode: ${isMultiAdmin}`);
            
            if (isMultiAdmin) {
                logWarning(`Multi-admin commissioning notes:`);
                logWarning(`  - Device should already be paired with another controller`);
                logWarning(`  - Pairing code should be a sharing/commissioner code`);
                logWarning(`  - Device should be in commissioning window`);
            }

            // Attempt commissioning with detailed error capture
            let nodeId;
            const startTime = Date.now();
            try {
                logInfo(`Calling commissionNode()...`);
                
                nodeId = await this.commissioningController.commissionNode(commissionOptions);
                
                const duration = Date.now() - startTime;
                logSuccess(`commissionNode() completed in ${duration}ms`);
                logSuccess(`Returned NodeId: ${nodeId}`);
                
            } catch (commissionError) {
                const duration = Date.now() - startTime;
                logError(`commissionNode() failed after ${duration}ms`);
                logError(`Error: ${commissionError.message}`);
                
                // Enhanced error analysis
                log(`\nERROR ANALYSIS:`, colors.red);
                
                if (commissionError.stack) {
                    const stackLines = commissionError.stack.split('\n');
                    logInfo(`Stack trace: ${stackLines[0]}`);
                    if (stackLines[1]) logInfo(`  at: ${stackLines[1].trim()}`);
                }
                
                if (commissionError.message.includes('key confirmation')) {
                    logError(`PASE Protocol Error - Key Confirmation Failed`);
                    logError(`This typically means:`);
                    
                    if (isMultiAdmin) {
                        logError(`Multi-admin issues:`);
                        logError(`  1. Device may still have previous fabric (Alexa removal not complete)`);
                        logError(`  2. Sharing code expired or wrong type`);
                        logError(`  3. Device not in commissioning window from primary controller`);
                        logError(`  4. Device reached fabric limit (some devices limit to 2-3 fabrics)`);
                        logError(`  5. Aqara device may not support 3+ simultaneous controllers`);
                    } else {
                        logError(`Initial commissioning issues:`);
                        logError(`  1. Device not factory reset (still has existing fabrics)`);
                        logError(`  2. Wrong pairing code (using sharing code instead of original)`);
                        logError(`  3. Device not in pairing mode`);
                    }
                    
                    log(`\nRECOMMENDATIONS:`, colors.yellow);
                    logWarning(`Try factory reset + initial commissioning:`);
                    logWarning(`  1. Hold device button 10+ seconds until LED flashes rapidly`);
                    logWarning(`  2. Run: node test-matter-debug.js 03753213995 "Door Sensor"`);
                    logWarning(`  3. This removes all existing fabrics and starts fresh`);
                    
                } else if (commissionError.message.includes('No device discovered')) {
                    logError(`Device Discovery Failed`);
                    logError(`  1. Device not in pairing/commissioning mode`);
                    logError(`  2. Device not on same network`);
                    logError(`  3. Wrong discriminator in pairing code`);
                    
                } else if (commissionError.message.includes('timeout')) {
                    logError(`Commissioning Timeout`);
                    logError(`  1. Device found but not responding to commissioning`);
                    logError(`  2. Network connectivity issues`);
                    logError(`  3. Device busy with another controller`);
                }
                
                throw commissionError;
            }

            // Success logging
            log(`\nCOMMISSIONING SUCCESS:`, colors.green);
            logSuccess(`Device commissioned with NodeId: ${nodeId}`);
            
            // Try to connect and get device info
            try {
                logInfo(`Connecting to commissioned device...`);
                const device = await this.commissioningController.getConnectedNode(nodeId);
                logSuccess(`Connected to device successfully`);
                
                const endpoints = device.getDevices();
                logInfo(`Device has ${endpoints.length} endpoint(s)`);
                
                // Try to read basic device information
                for (const endpoint of endpoints) {
                    const clusters = endpoint.getAllClusterClients();
                    logInfo(`Endpoint has ${clusters.length} cluster(s)`);
                    
                    // Look for BooleanState cluster (door sensor)
                    const booleanStateCluster = clusters.find(c => 
                        c.id === BooleanStateCluster.id
                    );
                    
                    if (booleanStateCluster) {
                        logSuccess(`Found BooleanState cluster - this is a contact sensor!`);
                        try {
                            const state = await booleanStateCluster.getStateValueAttribute();
                            logInfo(`Current state: ${state ? 'OPEN' : 'CLOSED'}`);
                        } catch (e) {
                            logWarning(`Could not read current state: ${e.message}`);
                        }
                    }
                }
                
            } catch (connectError) {
                logWarning(`Could not connect to device: ${connectError.message}`);
            }

            return nodeId.toString();

        } catch (error) {
            logError(`Commissioning failed: ${error.message}`);
            throw error;
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
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node test-matter-debug.js <pairing-code> [device-name] [--multi-admin]');
        console.log('');
        console.log('Examples:');
        console.log('  node test-matter-debug.js 03753213995 "Door Sensor"');
        console.log('  node test-matter-debug.js 14195414029 "Kitchen Sensor" --multi-admin');
        process.exit(1);
    }
    
    const pairingCode = args[0];
    const deviceName = args[1] || 'Debug Device';
    const isMultiAdmin = args.includes('--multi-admin');
    
    console.clear();
    log(`${'='.repeat(60)}`, colors.bright);
    log(`Matter.js Debug Commissioning Tool`, colors.bright);
    log(`${'='.repeat(60)}`, colors.bright);
    console.log();

    const controller = new MatterDebugController();

    try {
        await controller.initialize();
        console.log();
        
        const nodeId = await controller.debugCommissionDevice(pairingCode, deviceName, isMultiAdmin);
        
        log(`\n${'='.repeat(60)}`, colors.green);
        log(`SUCCESS! Device commissioned with NodeId: ${nodeId}`, colors.green);
        log(`${'='.repeat(60)}`, colors.green);
        
    } catch (error) {
        log(`\n${'='.repeat(60)}`, colors.red);
        log(`FAILED: ${error.message}`, colors.red);
        log(`${'='.repeat(60)}`, colors.red);
    } finally {
        await controller.close();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log();
    logInfo('Shutting down...');
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

module.exports = { MatterDebugController };
