/**
 * Commissioning Service
 * Handles device commissioning with proper timeout, network detection, and commissioning window management
 * Fixes the core issues causing commissioning failures
 */

const { QrPairingCodeCodec, ManualPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
const { CommissioningError, ValidationError, TimeoutError, NetworkError } = require('./errors');

class CommissioningService {
    constructor(matterService, options = {}) {
        this.matterService = matterService;
        this.options = {
            // Extended timeouts for Thread devices
            threadTimeout: 120, // seconds
            wifiTimeout: 60,   // seconds
            discoveryTimeout: 30, // seconds for initial discovery
            commissioningWindowTimeout: 10, // seconds to wait for commissioning window
            ...options
        };
        this.logger = options.logger || console;
    }

    async commissionDevice(pairingCode, deviceName, options = {}) {
        if (!this.matterService.isServiceInitialized()) {
            throw new CommissioningError('MatterService not initialized', 'SERVICE_NOT_INITIALIZED');
        }

        try {
            // Parse and validate pairing code
            const commissioningData = this.parsePairingCode(pairingCode);
            
            // Detect network type and set appropriate timeout
            const networkType = this.detectNetworkType(commissioningData);
            const timeout = this.getTimeoutForNetworkType(networkType);
            
            this.logger.info(`Commissioning device: ${deviceName || 'Unnamed'}`);
            this.logger.info(`Network type: ${networkType}, Timeout: ${timeout}s`);
            this.logger.info(`Multi-admin mode: ${options.multiAdmin || false}`);
            
            // Ensure commissioning window is properly managed
            await this.ensureCommissioningWindow(commissioningData, options);
            
            // Configure discovery options with proper settings
            const discoveryConfig = this.buildDiscoveryConfig(commissioningData, timeout, options);
            
            // Execute commissioning with proper error recovery
            const nodeId = await this.executeCommissioning(discoveryConfig, options);
            
            this.logger.info(`Device commissioned successfully with NodeId: ${nodeId}`);
            
            return {
                success: true,
                nodeId: nodeId.toString(),
                message: options.multiAdmin ? 
                    "Device added to Node-RED fabric (multi-admin)" : 
                    "Device commissioned successfully",
                multiAdmin: options.multiAdmin || false,
                networkType: networkType,
                commissioningData: {
                    discriminator: commissioningData.discriminator || commissioningData.shortDiscriminator,
                    vendorId: commissioningData.vendorId,
                    productId: commissioningData.productId
                }
            };
            
        } catch (error) {
            this.logger.error(`Commissioning failed: ${error.message}`);
            
            // Provide specific error messages based on error type
            if (error instanceof CommissioningError) {
                throw error;
            }
            
            // Convert generic errors to specific commissioning errors
            if (error.message.includes('key confirmation')) {
                throw new CommissioningError(
                    this.getKeyConfirmationErrorMessage(options.multiAdmin),
                    'KEY_CONFIRMATION_FAILED',
                    { originalError: error.message, multiAdmin: options.multiAdmin }
                );
            }
            
            if (error.message.includes('No device discovered') || error.message.includes('timeout')) {
                throw new CommissioningError(
                    'Device discovery failed - device not found during scan. Ensure device is in pairing mode and on the same network.',
                    'DEVICE_DISCOVERY_FAILED',
                    { originalError: error.message, timeout: this.options.discoveryTimeout }
                );
            }
            
            throw new CommissioningError(
                `Commissioning failed: ${error.message}`,
                'COMMISSIONING_FAILED',
                { originalError: error.message }
            );
        }
    }

    parsePairingCode(pairingCode) {
        if (!pairingCode || typeof pairingCode !== 'string') {
            throw new ValidationError('Pairing code is required and must be a string', 'INVALID_PAIRING_CODE');
        }

        const sanitizedCode = pairingCode.trim();
        
        try {
            if (sanitizedCode.startsWith('MT:')) {
                // QR Code format
                return QrPairingCodeCodec.decode(sanitizedCode);
            } else {
                // Manual pairing code (8-11 digits)
                const manualCodePattern = /^\d{8,11}(-\d{4,8})?$/;
                if (!manualCodePattern.test(sanitizedCode.replace(/-/g, ''))) {
                    throw new ValidationError(
                        'Invalid manual pairing code format. Expected 8-11 digits.',
                        'INVALID_MANUAL_CODE_FORMAT'
                    );
                }
                return ManualPairingCodeCodec.decode(sanitizedCode);
            }
        } catch (error) {
            throw new ValidationError(
                `Failed to parse pairing code: ${error.message}`,
                'PAIRING_CODE_PARSE_ERROR',
                { originalError: error.message, codeLength: sanitizedCode.length }
            );
        }
    }

    detectNetworkType(commissioningData) {
        // Detect Thread devices by vendor ID
        const threadVendors = {
            4447: 'Aqara', // Aqara devices often use Thread
            // Add other Thread vendors as needed
        };
        
        const vendorId = commissioningData.vendorId;
        if (vendorId && threadVendors[vendorId]) {
            this.logger.info(`Thread device detected: ${threadVendors[vendorId]} (vendor ID: ${vendorId})`);
            return 'thread';
        }
        
        // Default to WiFi for other devices
        return 'wifi';
    }

    getTimeoutForNetworkType(networkType) {
        return networkType === 'thread' ? this.options.threadTimeout : this.options.wifiTimeout;
    }

    async ensureCommissioningWindow(commissioningData, options) {
        // For Thread devices, we may need to wait for commissioning window
        if (this.detectNetworkType(commissioningData) === 'thread') {
            this.logger.info('Thread device detected - ensuring commissioning window is open');
            
            // Give Thread devices extra time to enter commissioning mode
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Additional wait for commissioning window
            await new Promise(resolve => setTimeout(resolve, this.options.commissioningWindowTimeout * 1000));
        }
    }

    buildDiscoveryConfig(commissioningData, timeout, options) {
        const discriminator = commissioningData.discriminator || commissioningData.shortDiscriminator;
        
        const config = {
            discovery: {
                identifierData: commissioningData,
                timeoutSeconds: timeout,
                discoveryCapabilities: {
                    onIpNetwork: true,
                    ble: false, // Disable BLE for now to focus on IP-based discovery
                    softAccessPoint: false
                }
            }
        };

        // Add Thread-specific configuration if needed
        if (this.detectNetworkType(commissioningData) === 'thread') {
            this.logger.info('Configuring Thread-specific discovery options');
            
            // Thread devices may need specific discovery settings
            config.discovery.discoveryCapabilities.onIpNetwork = true;
            
            // Add any Thread-specific options here
            if (options.threadCredentials) {
                config.discovery.threadCredentials = options.threadCredentials;
            }
        }

        this.logger.info(`Discovery config: discriminator=${discriminator}, timeout=${timeout}s`);
        return config;
    }

    async executeCommissioning(discoveryConfig, options) {
        const controller = this.matterService.getCommissioningController();
        const startTime = Date.now();
        
        try {
            this.logger.info('Starting commissioning process...');
            
            // Execute commissioning with timeout
            const nodeId = await Promise.race([
                controller.commissionNode(discoveryConfig),
                this.createTimeoutPromise(discoveryConfig.discovery.timeoutSeconds * 1000)
            ]);
            
            const duration = Date.now() - startTime;
            this.logger.info(`Commissioning completed in ${duration}ms`);
            
            return nodeId;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Commissioning failed after ${duration}ms: ${error.message}`);
            throw error;
        }
    }

    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new TimeoutError(
                    `Commissioning timed out after ${timeoutMs}ms`,
                    'COMMISSIONING_TIMEOUT',
                    { timeoutMs }
                ));
            }, timeoutMs);
        });
    }

    getKeyConfirmationErrorMessage(isMultiAdmin) {
        if (isMultiAdmin) {
            return 'Multi-admin commissioning failed: Key confirmation rejected. ' +
                   'Common issues: 1) Device fabric limit reached (try removing from other controllers), ' +
                   '2) Sharing code expired (generate fresh code), ' +
                   '3) Device not in commissioning window from primary controller, ' +
                   '4) Thread device may need Aqara M100 hub temporarily powered off.';
        } else {
            return 'Initial commissioning failed: Incorrect pairing code or device not in pairing mode. ' +
                   'Ensure device is factory reset and in pairing mode. ' +
                   'For Thread devices, try temporarily powering off the Aqara M100 hub.';
        }
    }

    // Utility method to validate commissioning data
    validateCommissioningData(commissioningData) {
        const required = ['discriminator', 'passcode'];
        const missing = required.filter(field => !commissioningData[field]);
        
        if (missing.length > 0) {
            throw new ValidationError(
                `Missing required commissioning data: ${missing.join(', ')}`,
                'MISSING_COMMISSIONING_DATA',
                { missing, available: Object.keys(commissioningData) }
            );
        }
        
        return true;
    }

    // Get commissioning statistics
    getCommissioningStats() {
        return {
            timeouts: {
                thread: this.options.threadTimeout,
                wifi: this.options.wifiTimeout,
                discovery: this.options.discoveryTimeout
            },
            networkTypes: ['thread', 'wifi'],
            supportedVendors: {
                4447: 'Aqara (Thread)'
            }
        };
    }
}

module.exports = CommissioningService;
