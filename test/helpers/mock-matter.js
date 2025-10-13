/**
 * Mock utilities for Matter.js testing
 */

// Mock Matter.js core modules
const mockMatter = {
    MatterServer: jest.fn().mockImplementation(() => ({
        addCommissioningController: jest.fn().mockResolvedValue(),
        start: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    })),
    
    CommissioningController: jest.fn().mockImplementation(() => ({
        commissionNode: jest.fn().mockResolvedValue('12345'),
        getConnectedNode: jest.fn().mockResolvedValue(mockDevice),
        getCommissionedNodes: jest.fn().mockResolvedValue(['12345']),
        removeNode: jest.fn().mockResolvedValue()
    }))
};

// Mock device object
const mockDevice = {
    getDevices: jest.fn().mockReturnValue([
        {
            id: 1,
            getAllClusterClients: jest.fn().mockReturnValue([
                {
                    constructor: { name: 'BooleanStateCluster' },
                    id: 'BooleanStateCluster',
                    getStateValueAttribute: jest.fn().mockResolvedValue(0),
                    subscribeStateValueAttribute: jest.fn().mockResolvedValue(jest.fn())
                }
            ])
        }
    ])
};

// Mock storage modules
const mockStorage = {
    StorageManager: jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue()
    })),
    
    StorageBackendDisk: jest.fn().mockImplementation(() => ({}))
};

// Mock schema modules
const mockSchema = {
    QrPairingCodeCodec: {
        decode: jest.fn().mockReturnValue({
            discriminator: 1234,
            shortDiscriminator: 1234,
            passcode: 12345678,
            vendorId: 4447,
            productId: 12345
        })
    },
    
    ManualPairingCodeCodec: {
        decode: jest.fn().mockReturnValue({
            discriminator: 1234,
            shortDiscriminator: 1234,
            passcode: 12345678,
            vendorId: 4447,
            productId: 12345
        })
    }
};

// Mock cluster modules
const mockCluster = {
    BooleanStateCluster: {
        id: 'BooleanStateCluster'
    },
    
    OnOffCluster: {
        id: 'OnOffCluster'
    },
    
    LevelControlCluster: {
        id: 'LevelControlCluster'
    }
};

module.exports = {
    mockMatter,
    mockStorage,
    mockSchema,
    mockCluster,
    mockDevice
};
