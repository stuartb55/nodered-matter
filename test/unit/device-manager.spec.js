/**
 * Unit tests for DeviceManager
 */

const DeviceManager = require('../../lib/device-manager');
const { DeviceNotFoundError, ClusterError } = require('../../lib/errors');
const { TestLogger, MockMatterService, testFixtures } = require('../helpers');

describe('DeviceManager', () => {
    let deviceManager;
    let matterService;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        matterService = new MockMatterService({ logger: testLogger });
        deviceManager = new DeviceManager(matterService, { logger: testLogger });
    });

    afterEach(async () => {
        if (deviceManager) {
            await deviceManager.close();
        }
    });

    describe('initialization', () => {
        it('should initialize successfully', async () => {
            await matterService.initialize();
            await deviceManager.initialize();
            
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: 'DeviceManager initialized' })
            );
        });

        it('should restore commissioned devices on initialization', async () => {
            await matterService.initialize();
            await deviceManager.initialize();
            
            // Should have restored the mock device
            const devices = deviceManager.getAllDevices();
            expect(devices.length).toBeGreaterThan(0);
        });
    });

    describe('device management', () => {
        beforeEach(async () => {
            await matterService.initialize();
            await deviceManager.initialize();
        });

        it('should add device successfully', async () => {
            const mockDevice = { getDevices: jest.fn().mockReturnValue([]) };
            const commissioningData = testFixtures.commissioningData.aqaraThread;
            
            const deviceInfo = await deviceManager.addDevice(
                '12345',
                mockDevice,
                'Test Device',
                commissioningData
            );

            expect(deviceInfo).toEqual({
                nodeId: '12345',
                device: mockDevice,
                name: 'Test Device',
                connected: true,
                commissioned: expect.any(String),
                restored: false,
                capabilities: expect.objectContaining({
                    clusters: ['BooleanStateCluster']
                }),
                vendorId: 4447,
                productId: 12345,
                lastSeen: expect.any(String)
            });
        });

        it('should get device by nodeId', async () => {
            const mockDevice = { getDevices: jest.fn().mockReturnValue([]) };
            await deviceManager.addDevice('12345', mockDevice, 'Test Device');

            const device = deviceManager.getDevice('12345');
            expect(device.nodeId).toBe('12345');
            expect(device.name).toBe('Test Device');
        });

        it('should throw DeviceNotFoundError for non-existent device', () => {
            expect(() => {
                deviceManager.getDevice('nonexistent');
            }).toThrow(DeviceNotFoundError);
        });

        it('should get all devices', async () => {
            const mockDevice1 = { getDevices: jest.fn().mockReturnValue([]) };
            const mockDevice2 = { getDevices: jest.fn().mockReturnValue([]) };
            
            await deviceManager.addDevice('12345', mockDevice1, 'Device 1');
            await deviceManager.addDevice('67890', mockDevice2, 'Device 2');

            const devices = deviceManager.getAllDevices();
            expect(devices).toHaveLength(2);
            expect(devices.map(d => d.nodeId)).toContain('12345');
            expect(devices.map(d => d.nodeId)).toContain('67890');
        });

        it('should get devices by capability', async () => {
            const mockDevice1 = { getDevices: jest.fn().mockReturnValue([]) };
            const mockDevice2 = { getDevices: jest.fn().mockReturnValue([]) };
            
            await deviceManager.addDevice('12345', mockDevice1, 'Contact Sensor');
            await deviceManager.addDevice('67890', mockDevice2, 'Switch');

            const contactDevices = deviceManager.getDevicesByCapability('BooleanStateCluster');
            expect(contactDevices.length).toBeGreaterThan(0);
        });
    });

    describe('device state management', () => {
        beforeEach(async () => {
            await matterService.initialize();
            await deviceManager.initialize();
        });

        it('should read device state successfully', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            {
                                constructor: { name: 'BooleanStateCluster' },
                                getStateValueAttribute: jest.fn().mockResolvedValue(0),
                                getStateValueListAttribute: jest.fn().mockResolvedValue([])
                            }
                        ])
                    }
                ])
            };

            await deviceManager.addDevice('12345', mockDevice, 'Test Device');
            
            const state = await deviceManager.getDeviceState('12345');
            
            expect(state).toEqual({
                nodeId: '12345',
                timestamp: expect.any(String),
                clusters: expect.objectContaining({
                    BooleanStateCluster: expect.objectContaining({
                        stateValue: 0
                    })
                })
            });
        });

        it('should handle device state read errors', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockImplementation(() => {
                    throw new Error('Device offline');
                })
            };

            await deviceManager.addDevice('12345', mockDevice, 'Test Device');
            
            await expect(deviceManager.getDeviceState('12345')).rejects.toThrow(ClusterError);
        });
    });

    describe('device subscription', () => {
        beforeEach(async () => {
            await matterService.initialize();
            await deviceManager.initialize();
        });

        it('should subscribe to device successfully', async () => {
            const mockDevice = { getDevices: jest.fn().mockReturnValue([]) };
            await deviceManager.addDevice('12345', mockDevice, 'Test Device');
            
            const callback = jest.fn();
            await deviceManager.subscribeToDevice('12345', callback);
            
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('Subscribed to device 12345') })
            );
        });

        it('should unsubscribe from device successfully', async () => {
            const mockDevice = { getDevices: jest.fn().mockReturnValue([]) };
            await deviceManager.addDevice('12345', mockDevice, 'Test Device');
            
            await deviceManager.subscribeToDevice('12345', jest.fn());
            await deviceManager.unsubscribeFromDevice('12345');
            
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('Unsubscribed from device 12345') })
            );
        });
    });

    describe('device statistics', () => {
        beforeEach(async () => {
            await matterService.initialize();
            await deviceManager.initialize();
        });

        it('should return device statistics', async () => {
            const mockDevice1 = { getDevices: jest.fn().mockReturnValue([]) };
            const mockDevice2 = { getDevices: jest.fn().mockReturnValue([]) };
            
            await deviceManager.addDevice('12345', mockDevice1, 'Device 1');
            await deviceManager.addDevice('67890', mockDevice2, 'Device 2');

            const stats = deviceManager.getDeviceStats();
            
            expect(stats).toEqual({
                total: 2,
                connected: 2,
                restored: 0,
                byCapability: expect.any(Object),
                byVendor: expect.any(Object)
            });
        });
    });

    describe('cleanup', () => {
        it('should close properly', async () => {
            await matterService.initialize();
            await deviceManager.initialize();
            await deviceManager.close();
            
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: 'DeviceManager closed' })
            );
        });
    });
});
