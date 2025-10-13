/**
 * Test utilities and helper functions
 */

const { mockMatter, mockStorage, mockSchema, mockCluster, mockDevice } = require('./mock-matter');

class TestLogger {
    constructor() {
        this.logs = [];
    }
    
    info(msg) {
        this.logs.push({ level: 'info', message: msg });
    }
    
    warn(msg) {
        this.logs.push({ level: 'warn', message: msg });
    }
    
    error(msg) {
        this.logs.push({ level: 'error', message: msg });
    }
    
    debug(msg) {
        this.logs.push({ level: 'debug', message: msg });
    }
    
    clear() {
        this.logs = [];
    }
    
    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return this.logs;
    }
}

class MockMatterService {
    constructor(options = {}) {
        this.options = options;
        this.isInitialized = false;
        this.logger = options.logger || new TestLogger();
    }
    
    async initialize() {
        this.isInitialized = true;
        this.logger.info('Mock MatterService initialized');
    }
    
    async close() {
        this.isInitialized = false;
        this.logger.info('Mock MatterService closed');
    }
    
    isServiceInitialized() {
        return this.isInitialized;
    }
    
    getCommissioningController() {
        return new mockMatter.CommissioningController();
    }
    
    getMatterServer() {
        return new mockMatter.MatterServer();
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            healthy: true,
            networkInfo: this.options
        };
    }
}

class MockCommissioningService {
    constructor(matterService, options = {}) {
        this.matterService = matterService;
        this.options = options;
        this.logger = options.logger || new TestLogger();
    }
    
    async commissionDevice(pairingCode, deviceName, options = {}) {
        // Simulate commissioning process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
            success: true,
            nodeId: '12345',
            message: options.multiAdmin ? 
                "Device added to Node-RED fabric (multi-admin)" : 
                "Device commissioned successfully",
            multiAdmin: options.multiAdmin || false,
            networkType: 'thread',
            commissioningData: {
                discriminator: 1234,
                vendorId: 4447,
                productId: 12345
            }
        };
    }
    
    parsePairingCode(pairingCode) {
        if (pairingCode.startsWith('MT:')) {
            return mockSchema.QrPairingCodeCodec.decode(pairingCode);
        } else {
            return mockSchema.ManualPairingCodeCodec.decode(pairingCode);
        }
    }
    
    detectNetworkType(commissioningData) {
        return commissioningData.vendorId === 4447 ? 'thread' : 'wifi';
    }
}

class MockDeviceManager {
    constructor(matterService, options = {}) {
        this.matterService = matterService;
        this.devices = new Map();
        this.deviceStates = new Map();
        this.options = options;
        this.logger = options.logger || new TestLogger();
    }
    
    async initialize() {
        this.logger.info('Mock DeviceManager initialized');
    }
    
    async addDevice(nodeId, device, deviceName, commissioningData = {}) {
        const deviceInfo = {
            nodeId: nodeId,
            device: device,
            name: deviceName || `Device-${nodeId}`,
            connected: true,
            commissioned: new Date().toISOString(),
            restored: false,
            capabilities: {
                clusters: ['BooleanStateCluster'],
                endpoints: [],
                deviceTypes: []
            },
            vendorId: commissioningData.vendorId || null,
            productId: commissioningData.productId || null,
            lastSeen: new Date().toISOString()
        };
        
        this.devices.set(nodeId.toString(), deviceInfo);
        return deviceInfo;
    }
    
    getDevice(nodeId) {
        const device = this.devices.get(nodeId.toString());
        if (!device) {
            throw new Error(`Device ${nodeId} not found`);
        }
        return device;
    }
    
    getAllDevices() {
        return Array.from(this.devices.values());
    }
    
    async getDeviceState(nodeId) {
        return {
            nodeId: nodeId,
            timestamp: new Date().toISOString(),
            clusters: {
                BooleanStateCluster: {
                    stateValue: 0,
                    state: 'closed'
                }
            }
        };
    }
    
    async subscribeToDevice(nodeId, callback) {
        // Mock subscription
        return Promise.resolve();
    }
    
    async unsubscribeFromDevice(nodeId) {
        // Mock unsubscription
        return Promise.resolve();
    }
    
    getDeviceStats() {
        return {
            total: this.devices.size,
            connected: Array.from(this.devices.values()).filter(d => d.connected).length,
            restored: Array.from(this.devices.values()).filter(d => d.restored).length,
            byCapability: {},
            byVendor: {}
        };
    }
    
    async close() {
        this.logger.info('Mock DeviceManager closed');
    }
}

// Test data fixtures
const testFixtures = {
    validPairingCodes: {
        manual: '12345678901',
        qr: 'MT:12345678901234567890'
    },
    
    invalidPairingCodes: {
        tooShort: '123',
        tooLong: '123456789012345678901234567890',
        invalidChars: 'abc123def456',
        empty: ''
    },
    
    commissioningData: {
        aqaraThread: {
            discriminator: 1234,
            shortDiscriminator: 1234,
            passcode: 12345678,
            vendorId: 4447,
            productId: 12345
        },
        
        wifiDevice: {
            discriminator: 5678,
            shortDiscriminator: 5678,
            passcode: 87654321,
            vendorId: 1234,
            productId: 56789
        }
    },
    
    deviceStates: {
        contactClosed: {
            stateValue: 0,
            state: 'closed',
            contact: 'closed'
        },
        
        contactOpen: {
            stateValue: 1,
            state: 'open',
            contact: 'open'
        },
        
        switchOn: {
            onOff: true,
            state: 'on'
        },
        
        switchOff: {
            onOff: false,
            state: 'off'
        },
        
        dimmer50: {
            currentLevel: 127,
            percentage: 50,
            state: 50
        }
    }
};

module.exports = {
    TestLogger,
    MockMatterService,
    MockCommissioningService,
    MockDeviceManager,
    testFixtures
};
