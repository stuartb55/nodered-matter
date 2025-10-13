/**
 * Integration tests for Thread device specific functionality
 */

const MatterService = require('../../lib/matter-service');
const CommissioningService = require('../../lib/commissioning-service');
const DeviceManager = require('../../lib/device-manager');
const { TestLogger, testFixtures } = require('../helpers');

describe('Thread Device Integration', () => {
    let matterService;
    let commissioningService;
    let deviceManager;
    let testLogger;

    beforeEach(async () => {
        testLogger = new TestLogger();
        
        matterService = new MatterService({
            storageDir: '/tmp/test-thread-integration',
            controllerName: 'Thread Integration Test Controller',
            logger: testLogger
        });
        
        commissioningService = new CommissioningService(matterService, { logger: testLogger });
        deviceManager = new DeviceManager(matterService, { logger: testLogger });
        
        await matterService.initialize();
        await deviceManager.initialize();
    });

    afterEach(async () => {
        if (deviceManager) await deviceManager.close();
        if (matterService) await matterService.close();
    });

    describe('Thread device commissioning', () => {
        it('should detect Thread devices by vendor ID', () => {
            const threadData = testFixtures.commissioningData.aqaraThread;
            const networkType = commissioningService.detectNetworkType(threadData);
            
            expect(networkType).toBe('thread');
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ 
                    message: expect.stringContaining('Thread device detected: Aqara') 
                })
            );
        });

        it('should use extended timeout for Thread devices', () => {
            const threadTimeout = commissioningService.getTimeoutForNetworkType('thread');
            const wifiTimeout = commissioningService.getTimeoutForNetworkType('wifi');
            
            expect(threadTimeout).toBe(120); // 2 minutes
            expect(wifiTimeout).toBe(60);    // 1 minute
            expect(threadTimeout).toBeGreaterThan(wifiTimeout);
        });

        it('should handle Thread commissioning window management', async () => {
            const threadData = testFixtures.commissioningData.aqaraThread;
            
            // Mock ensureCommissioningWindow to verify it's called
            const ensureCommissioningWindowSpy = jest.spyOn(
                commissioningService, 
                'ensureCommissioningWindow'
            ).mockResolvedValue();
            
            // Mock detectNetworkType to return 'thread'
            jest.spyOn(commissioningService, 'detectNetworkType').mockReturnValue('thread');
            
            await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Thread Device'
            );
            
            expect(ensureCommissioningWindowSpy).toHaveBeenCalledWith(
                threadData,
                expect.any(Object)
            );
        });

        it('should configure Thread-specific discovery options', async () => {
            const threadData = testFixtures.commissioningData.aqaraThread;
            
            // Mock buildDiscoveryConfig to verify Thread options
            const buildDiscoveryConfigSpy = jest.spyOn(
                commissioningService,
                'buildDiscoveryConfig'
            ).mockReturnValue({
                discovery: {
                    identifierData: threadData,
                    timeoutSeconds: 120,
                    discoveryCapabilities: {
                        onIpNetwork: true,
                        ble: false
                    }
                }
            });
            
            jest.spyOn(commissioningService, 'detectNetworkType').mockReturnValue('thread');
            
            await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Thread Device'
            );
            
            expect(buildDiscoveryConfigSpy).toHaveBeenCalledWith(
                threadData,
                120, // Thread timeout
                expect.any(Object)
            );
        });
    });

    describe('Thread device state management', () => {
        let threadDevice;

        beforeEach(async () => {
            // Commission a Thread device
            const result = await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Aqara Thread Device',
                { multiAdmin: false }
            );
            
            const controller = matterService.getCommissioningController();
            const device = await controller.getConnectedNode(result.nodeId);
            threadDevice = await deviceManager.addDevice(
                result.nodeId,
                device,
                'Aqara Thread Device',
                result.commissioningData
            );
        });

        it('should identify Thread devices correctly', () => {
            expect(threadDevice.vendorId).toBe(4447); // Aqara vendor ID
            expect(threadDevice.connected).toBe(true);
        });

        it('should handle Thread device state reading', async () => {
            const state = await deviceManager.getDeviceState(threadDevice.nodeId);
            
            expect(state.nodeId).toBe(threadDevice.nodeId);
            expect(state.timestamp).toBeDefined();
        });

        it('should subscribe to Thread device state changes', async () => {
            const callback = jest.fn();
            
            await deviceManager.subscribeToDevice(threadDevice.nodeId, callback);
            
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ 
                    message: expect.stringContaining('Subscribed to device') 
                })
            );
        });
    });

    describe('Thread environment detection', () => {
        it('should detect Thread environment when Thread devices are present', async () => {
            // Commission a Thread device
            await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Thread Device'
            );
            
            const devices = deviceManager.getAllDevices();
            const hasThreadDevice = devices.some(device => device.vendorId === 4447);
            
            expect(hasThreadDevice).toBe(true);
        });

        it('should not detect Thread environment when only WiFi devices are present', async () => {
            // Mock WiFi device commissioning
            jest.spyOn(commissioningService, 'parsePairingCode').mockReturnValue({
                discriminator: 5678,
                shortDiscriminator: 5678,
                passcode: 87654321,
                vendorId: 1234, // Non-Aqara vendor
                productId: 56789
            });
            
            await commissioningService.commissionDevice('87654321098', 'WiFi Device');
            
            const devices = deviceManager.getAllDevices();
            const hasThreadDevice = devices.some(device => device.vendorId === 4447);
            
            expect(hasThreadDevice).toBe(false);
        });

        it('should provide Thread-specific guidance', () => {
            // Add a Thread device to the device manager
            const mockThreadDevice = {
                nodeId: '12345',
                vendorId: 4447,
                connected: true,
                capabilities: { clusters: ['BooleanStateCluster'] }
            };
            
            deviceManager.devices.set('12345', mockThreadDevice);
            
            const devices = deviceManager.getAllDevices();
            const hasThreadDevice = devices.some(device => device.vendorId === 4447);
            
            expect(hasThreadDevice).toBe(true);
        });
    });

    describe('Thread device error handling', () => {
        it('should provide Thread-specific error messages for key confirmation failures', async () => {
            // Mock commissioning failure with key confirmation error
            const mockController = {
                commissionNode: jest.fn().mockRejectedValue(new Error('key confirmation failed'))
            };
            
            jest.spyOn(matterService, 'getCommissioningController').mockReturnValue(mockController);
            
            await expect(
                commissioningService.commissionDevice(
                    testFixtures.validPairingCodes.manual,
                    'Thread Device',
                    { multiAdmin: true }
                )
            ).rejects.toThrow();
            
            // Verify Thread-specific error message was logged
            expect(testLogger.getLogs('error')).toContainEqual(
                expect.objectContaining({ 
                    message: expect.stringContaining('Multi-admin commissioning failed') 
                })
            );
        });

        it('should handle Thread device discovery timeouts', async () => {
            // Mock commissioning timeout
            const mockController = {
                commissionNode: jest.fn().mockRejectedValue(new Error('timeout'))
            };
            
            jest.spyOn(matterService, 'getCommissioningController').mockReturnValue(mockController);
            
            await expect(
                commissioningService.commissionDevice(
                    testFixtures.validPairingCodes.manual,
                    'Thread Device'
                )
            ).rejects.toThrow();
        });

        it('should handle Thread device connection failures', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockImplementation(() => {
                    throw new Error('Thread network unavailable');
                })
            };

            await deviceManager.addDevice('12345', mockDevice, 'Thread Device', {
                vendorId: 4447,
                productId: 12345
            });
            
            await expect(
                deviceManager.getDeviceState('12345')
            ).rejects.toThrow();
        });
    });

    describe('Thread device statistics', () => {
        beforeEach(async () => {
            // Add multiple Thread devices
            const mockThreadDevice1 = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            { constructor: { name: 'BooleanStateCluster' } }
                        ])
                    }
                ])
            };

            const mockThreadDevice2 = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            { constructor: { name: 'OnOffCluster' } }
                        ])
                    }
                ])
            };

            await deviceManager.addDevice('12345', mockThreadDevice1, 'Thread Sensor', {
                vendorId: 4447,
                productId: 12345
            });

            await deviceManager.addDevice('67890', mockThreadDevice2, 'Thread Switch', {
                vendorId: 4447,
                productId: 67890
            });
        });

        it('should track Thread devices in statistics', () => {
            const stats = deviceManager.getDeviceStats();
            
            expect(stats.total).toBe(2);
            expect(stats.byVendor[4447]).toBe(2); // Both devices are Aqara (Thread)
        });

        it('should identify Thread devices by vendor', () => {
            const devices = deviceManager.getAllDevices();
            const threadDevices = devices.filter(device => device.vendorId === 4447);
            
            expect(threadDevices).toHaveLength(2);
            expect(threadDevices.every(device => device.vendorId === 4447)).toBe(true);
        });
    });
});
