/**
 * Core Matter Service
 * Handles MatterServer lifecycle, storage management, and network configuration
 */

const { MatterServer, CommissioningController } = require("@project-chip/matter-node.js");
const { StorageBackendDisk, StorageManager } = require("@project-chip/matter-node.js/storage");
const { ConfigurationError, NetworkError } = require('./errors');
const path = require('path');
const fs = require('fs');

class MatterService {
    constructor(options = {}) {
        this.options = {
            storageDir: options.storageDir || path.join(process.cwd(), '.node-red-matter'),
            controllerName: options.controllerName || 'Node-RED Matter Controller',
            autoConnect: options.autoConnect || false,
            mdns: {
                enableIpv4: true,
                enableIpv6: true,
                multicastInterface: 'auto',
                ...options.mdns
            },
            ...options
        };
        
        this.matterServer = null;
        this.commissioningController = null;
        this.storageManager = null;
        this.isInitialized = false;
        this.logger = options.logger || console;
    }

    async initialize() {
        if (this.isInitialized) {
            this.logger.warn('MatterService already initialized');
            return;
        }

        try {
            this.logger.info('Initializing MatterService...');
            
            // Ensure storage directory exists
            await this.ensureStorageDirectory();
            
            // Initialize storage manager
            await this.initializeStorage();
            
            // Create Matter server
            await this.createMatterServer();
            
            // Create commissioning controller with proper network configuration
            await this.createCommissioningController();
            
            // Start Matter server
            await this.startMatterServer();
            
            this.isInitialized = true;
            this.logger.info('MatterService initialized successfully');
            
        } catch (error) {
            this.logger.error(`Failed to initialize MatterService: ${error.message}`);
            throw new ConfigurationError(`MatterService initialization failed: ${error.message}`, 'INIT_FAILED', {
                originalError: error.message,
                storageDir: this.options.storageDir
            });
        }
    }

    async ensureStorageDirectory() {
        try {
            if (!fs.existsSync(this.options.storageDir)) {
                fs.mkdirSync(this.options.storageDir, { recursive: true, mode: 0o755 });
                this.logger.info(`Created storage directory: ${this.options.storageDir}`);
            }
        } catch (error) {
            throw new ConfigurationError(`Failed to create storage directory: ${error.message}`, 'STORAGE_DIR_ERROR', {
                storageDir: this.options.storageDir,
                originalError: error.message
            });
        }
    }

    async initializeStorage() {
        try {
            this.storageManager = new StorageManager(new StorageBackendDisk(this.options.storageDir));
            await this.storageManager.initialize();
            this.logger.info('Storage manager initialized');
        } catch (error) {
            throw new ConfigurationError(`Failed to initialize storage: ${error.message}`, 'STORAGE_INIT_ERROR', {
                originalError: error.message
            });
        }
    }

    async createMatterServer() {
        try {
            this.matterServer = new MatterServer(this.storageManager);
            this.logger.info('Matter server created');
        } catch (error) {
            throw new ConfigurationError(`Failed to create Matter server: ${error.message}`, 'SERVER_CREATE_ERROR', {
                originalError: error.message
            });
        }
    }

    async createCommissioningController() {
        try {
            // Configure commissioning controller with proper network settings
            const controllerOptions = {
                autoConnect: this.options.autoConnect,
                mdns: this.options.mdns,
                listeningAddressIpv4: '0.0.0.0',
                listeningAddressIpv6: '::',
                // Additional network configuration for better device discovery
                networkInterface: 'auto',
                enableIpv4: true,
                enableIpv6: true
            };

            this.commissioningController = new CommissioningController(controllerOptions);
            
            // Add controller to Matter server
            await this.matterServer.addCommissioningController(this.commissioningController);
            
            this.logger.info('Commissioning controller created and configured');
            this.logger.info(`MDNS configuration: IPv4=${this.options.mdns.enableIpv4}, IPv6=${this.options.mdns.enableIpv6}`);
            
        } catch (error) {
            throw new NetworkError(`Failed to create commissioning controller: ${error.message}`, 'CONTROLLER_CREATE_ERROR', {
                originalError: error.message,
                mdnsConfig: this.options.mdns
            });
        }
    }

    async startMatterServer() {
        try {
            await this.matterServer.start();
            this.logger.info('Matter server started successfully');
        } catch (error) {
            throw new NetworkError(`Failed to start Matter server: ${error.message}`, 'SERVER_START_ERROR', {
                originalError: error.message
            });
        }
    }

    async close() {
        if (!this.isInitialized) {
            return;
        }

        try {
            this.logger.info('Closing MatterService...');
            
            if (this.matterServer) {
                await this.matterServer.close();
                this.logger.info('Matter server closed');
            }
            
            this.isInitialized = false;
            this.logger.info('MatterService closed successfully');
            
        } catch (error) {
            this.logger.error(`Error closing MatterService: ${error.message}`);
            throw new ConfigurationError(`Failed to close MatterService: ${error.message}`, 'CLOSE_ERROR', {
                originalError: error.message
            });
        }
    }

    getCommissioningController() {
        if (!this.isInitialized) {
            throw new ConfigurationError('MatterService not initialized', 'NOT_INITIALIZED');
        }
        return this.commissioningController;
    }

    getMatterServer() {
        if (!this.isInitialized) {
            throw new ConfigurationError('MatterService not initialized', 'NOT_INITIALIZED');
        }
        return this.matterServer;
    }

    isServiceInitialized() {
        return this.isInitialized;
    }

    getNetworkInfo() {
        return {
            mdns: this.options.mdns,
            storageDir: this.options.storageDir,
            initialized: this.isInitialized,
            controllerName: this.options.controllerName
        };
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.isInitialized) {
                return { status: 'not_initialized', healthy: false };
            }

            // Check if commissioning controller is accessible
            const controller = this.getCommissioningController();
            if (!controller) {
                return { status: 'controller_missing', healthy: false };
            }

            return { 
                status: 'healthy', 
                healthy: true,
                networkInfo: this.getNetworkInfo()
            };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                healthy: false, 
                error: error.message 
            };
        }
    }
}

module.exports = MatterService;
