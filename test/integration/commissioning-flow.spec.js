/**
 * Integration tests for commissioning flow
 */

const MatterService = require('../../lib/matter-service');
const CommissioningService = require('../../lib/commissioning-service');
const DeviceManager = require('../../lib/device-manager');
const { TestLogger, testFixtures } = require('../helpers');

describe('Commissioning Flow Integration', () => {
    let matterService;
    let commissioningService;
    let deviceManager;
    let testLogger;

    beforeEach(async () => {
        testLogger = new TestLogger();
        
        matterService = new MatterService({
            storageDir: '/tmp/test-matter-integration',
            controllerName: 'Integration Test Controller',
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

    describe('end-to-end commissioning', () => {
        it('should commission Aqara Thread device successfully', async () => {
            const pairingCode = testFixtures.validPairingCodes.manual;
            const deviceName = 'Aqara Door Sensor';
            
            // Commission device
            const result = await commissioningService.commissionDevice(pairingCode, deviceName, {
                multiAdmin: false
            });
            
            expect(result.success).toBe(true);
            expect(result.nodeId).toBeDefined();
            expect(result.networkType).toBe('thread');
            expect(result.message).toContain('commissioned successfully');
            
            // Verify device was added to device manager
            const device = deviceManager.getDevice(result.nodeId);
            expect(device.name).toBe(deviceName);
            expect(device.vendorId).toBe(4447); // Aqara vendor ID
            expect(device.connected).toBe(true);
        });

        it('should commission WiFi device successfully', async () => {
            // Mock WiFi device commissioning data
            const wifiPairingCode = '87654321098';
            const deviceName = 'WiFi Switch';
            
            // Mock the commissioning data for WiFi device
            jest.spyOn(commissioningService, 'parsePairingCode').mockReturnValue({
                discriminator: 5678,
                shortDiscriminator: 5678,
                passcode: 87654321,
                vendorId: 1234, // Non-Aqara vendor
                productId: 56789
            });
            
            const result = await commissioningService.commissionDevice(wifiPairingCode, deviceName);
            
            expect(result.success).toBe(true);
            expect(result.networkType).toBe('wifi');
            expect(result.message).toContain('commissioned successfully');
        });

        it('should handle multi-admin commissioning', async () => {
            const pairingCode = testFixtures.validPairingCodes.manual;
            const deviceName = 'Multi-Admin Device';
            
            const result = await commissioningService.commissionDevice(pairingCode, deviceName, {
                multiAdmin: true
            });
            
            expect(result.success).toBe(true);
            expect(result.multiAdmin).toBe(true);
            expect(result.message).toContain('multi-admin');
        });

        it('should handle commissioning failures gracefully', async () => {
            // Mock commissioning failure
            const mockController = {
                commissionNode: jest.fn().mockRejectedValue(new Error('Device not found'))
            };
            
            jest.spyOn(matterService, 'getCommissioningController').mockReturnValue(mockController);
            
            const pairingCode = testFixtures.validPairingCodes.manual;
            
            await expect(
                commissioningService.commissionDevice(pairingCode, 'Test Device')
            ).rejects.toThrow();
        });
    });

    describe('device state management integration', () => {
        let commissionedDevice;

        beforeEach(async () => {
            // Commission a test device
            const result = await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Test Device'
            );
            
            const controller = matterService.getCommissioningController();
            const device = await controller.getConnectedNode(result.nodeId);
            commissionedDevice = await deviceManager.addDevice(
                result.nodeId,
                device,
                'Test Device',
                result.commissioningData
            );
        });

        it('should read device state after commissioning', async () => {
            const state = await deviceManager.getDeviceState(commissionedDevice.nodeId);
            
            expect(state.nodeId).toBe(commissionedDevice.nodeId);
            expect(state.timestamp).toBeDefined();
            expect(state.clusters).toBeDefined();
        });

        it('should subscribe to device state changes', async () => {
            const callback = jest.fn();
            
            await deviceManager.subscribeToDevice(commissionedDevice.nodeId, callback);
            
            // Verify subscription was created
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ 
                    message: expect.stringContaining('Subscribed to device') 
                })
            );
        });

        it('should handle device disconnection', async () => {
            // Simulate device disconnection
            const mockDevice = {
                getDevices: jest.fn().mockImplementation(() => {
                    throw new Error('Device offline');
                })
            };
            
            // Update device with mock that throws error
            commissionedDevice.device = mockDevice;
            deviceManager.devices.set(commissionedDevice.nodeId, commissionedDevice);
            
            await expect(
                deviceManager.getDeviceState(commissionedDevice.nodeId)
            ).rejects.toThrow();
        });
    });

    describe('error handling integration', () => {
        it('should handle invalid pairing codes', async () => {
            await expect(
                commissioningService.commissionDevice('invalid-code', 'Test Device')
            ).rejects.toThrow();
        });

        it('should handle service not initialized', async () => {
            const uninitializedService = new MatterService();
            const uninitializedCommissioning = new CommissioningService(uninitializedService);
            
            await expect(
                uninitializedCommissioning.commissionDevice('12345678901', 'Test Device')
            ).rejects.toThrow();
        });

        it('should handle device not found in device manager', () => {
            expect(() => {
                deviceManager.getDevice('nonexistent-device');
            }).toThrow();
        });
    });

    describe('health check integration', () => {
        it('should perform health check on all services', async () => {
            const matterHealth = await matterService.healthCheck();
            const deviceStats = deviceManager.getDeviceStats();
            
            expect(matterHealth.healthy).toBe(true);
            expect(deviceStats.total).toBeGreaterThanOrEqual(0);
        });

        it('should detect Thread environment', async () => {
            // Commission a Thread device
            await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Thread Device'
            );
            
            const devices = deviceManager.getAllDevices();
            const hasThreadDevice = devices.some(device => device.vendorId === 4447);
            
            expect(hasThreadDevice).toBe(true);
        });
    });
});
