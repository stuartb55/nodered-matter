/**
 * Integration tests for device subscription and state management
 */

const MatterService = require('../../lib/matter-service');
const DeviceManager = require('../../lib/device-manager');
const ClusterAdapterFactory = require('../../lib/clusters');
const { TestLogger, testFixtures } = require('../helpers');

describe('Device Subscription Integration', () => {
    let matterService;
    let deviceManager;
    let testLogger;

    beforeEach(async () => {
        testLogger = new TestLogger();
        
        matterService = new MatterService({
            storageDir: '/tmp/test-device-integration',
            controllerName: 'Device Integration Test Controller',
            logger: testLogger
        });
        
        deviceManager = new DeviceManager(matterService, { logger: testLogger });
        
        await matterService.initialize();
        await deviceManager.initialize();
    });

    afterEach(async () => {
        if (deviceManager) await deviceManager.close();
        if (matterService) await matterService.close();
    });

    describe('device state subscription', () => {
        let testDevice;

        beforeEach(async () => {
            // Create a mock device with BooleanState cluster
            const mockDevice = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        id: 1,
                        getAllClusterClients: jest.fn().mockReturnValue([
                            {
                                constructor: { name: 'BooleanStateCluster' },
                                id: 'BooleanStateCluster',
                                nodeId: '12345',
                                getStateValueAttribute: jest.fn().mockResolvedValue(0),
                                getStateValueListAttribute: jest.fn().mockResolvedValue([]),
                                subscribeStateValueAttribute: jest.fn().mockResolvedValue(jest.fn())
                            }
                        ])
                    }
                ])
            };

            testDevice = await deviceManager.addDevice(
                '12345',
                mockDevice,
                'Test Contact Sensor',
                testFixtures.commissioningData.aqaraThread
            );
        });

        it('should read device state correctly', async () => {
            const state = await deviceManager.getDeviceState('12345');
            
            expect(state.nodeId).toBe('12345');
            expect(state.clusters.BooleanStateCluster).toBeDefined();
            expect(state.clusters.BooleanStateCluster.stateValue).toBe(0);
        });

        it('should subscribe to device state changes', async () => {
            const callback = jest.fn();
            
            await deviceManager.subscribeToDevice('12345', callback);
            
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ 
                    message: expect.stringContaining('Subscribed to device 12345') 
                })
            );
        });

        it('should handle subscription errors gracefully', async () => {
            // Mock cluster that throws error on subscription
            const mockDeviceWithError = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            {
                                constructor: { name: 'BooleanStateCluster' },
                                subscribeStateValueAttribute: jest.fn().mockRejectedValue(new Error('Subscription failed'))
                            }
                        ])
                    }
                ])
            };

            await deviceManager.addDevice('67890', mockDeviceWithError, 'Error Device');
            
            const callback = jest.fn();
            
            // Should not throw error, but log warning
            await deviceManager.subscribeToDevice('67890', callback);
            
            expect(testLogger.getLogs('warn')).toContainEqual(
                expect.objectContaining({ 
                    message: expect.stringContaining('Failed to subscribe to device') 
                })
            );
        });
    });

    describe('cluster adapter integration', () => {
        it('should create correct adapter for BooleanState cluster', () => {
            const mockCluster = {
                constructor: { name: 'BooleanStateCluster' },
                id: 'BooleanStateCluster',
                nodeId: '12345',
                getStateValueAttribute: jest.fn().mockResolvedValue(0),
                getStateValueListAttribute: jest.fn().mockResolvedValue([]),
                subscribeStateValueAttribute: jest.fn().mockResolvedValue(jest.fn())
            };

            const adapter = ClusterAdapterFactory.createAdapter(mockCluster, {
                logger: testLogger
            });

            expect(adapter).toBeInstanceOf(require('../../lib/clusters/boolean-state-adapter'));
        });

        it('should create correct adapter for OnOff cluster', () => {
            const mockCluster = {
                constructor: { name: 'OnOffCluster' },
                id: 'OnOffCluster',
                nodeId: '12345',
                getOnOffAttribute: jest.fn().mockResolvedValue(false),
                subscribeOnOffAttribute: jest.fn().mockResolvedValue(jest.fn()),
                toggle: jest.fn().mockResolvedValue()
            };

            const adapter = ClusterAdapterFactory.createAdapter(mockCluster, {
                logger: testLogger
            });

            expect(adapter).toBeInstanceOf(require('../../lib/clusters/on-off-adapter'));
        });

        it('should create correct adapter for LevelControl cluster', () => {
            const mockCluster = {
                constructor: { name: 'LevelControlCluster' },
                id: 'LevelControlCluster',
                nodeId: '12345',
                getCurrentLevelAttribute: jest.fn().mockResolvedValue(127),
                getMinLevelAttribute: jest.fn().mockResolvedValue(0),
                getMaxLevelAttribute: jest.fn().mockResolvedValue(254),
                subscribeCurrentLevelAttribute: jest.fn().mockResolvedValue(jest.fn()),
                moveToLevel: jest.fn().mockResolvedValue()
            };

            const adapter = ClusterAdapterFactory.createAdapter(mockCluster, {
                logger: testLogger
            });

            expect(adapter).toBeInstanceOf(require('../../lib/clusters/level-control-adapter'));
        });
    });

    describe('device capability detection', () => {
        it('should detect device capabilities correctly', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        id: 1,
                        getAllClusterClients: jest.fn().mockReturnValue([
                            {
                                constructor: { name: 'BooleanStateCluster' }
                            },
                            {
                                constructor: { name: 'OnOffCluster' }
                            }
                        ])
                    }
                ])
            };

            const deviceInfo = await deviceManager.addDevice(
                '12345',
                mockDevice,
                'Multi-Cluster Device'
            );

            expect(deviceInfo.capabilities.clusters).toContain('BooleanStateCluster');
            expect(deviceInfo.capabilities.clusters).toContain('OnOffCluster');
        });

        it('should handle devices with no clusters', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([])
                    }
                ])
            };

            const deviceInfo = await deviceManager.addDevice(
                '12345',
                mockDevice,
                'No Cluster Device'
            );

            expect(deviceInfo.capabilities.clusters).toEqual(['Unknown']);
        });
    });

    describe('device statistics and monitoring', () => {
        beforeEach(async () => {
            // Add multiple test devices
            const mockDevice1 = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            { constructor: { name: 'BooleanStateCluster' } }
                        ])
                    }
                ])
            };

            const mockDevice2 = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            { constructor: { name: 'OnOffCluster' } }
                        ])
                    }
                ])
            };

            await deviceManager.addDevice('12345', mockDevice1, 'Contact Sensor', {
                vendorId: 4447,
                productId: 12345
            });

            await deviceManager.addDevice('67890', mockDevice2, 'Switch', {
                vendorId: 1234,
                productId: 56789
            });
        });

        it('should provide accurate device statistics', () => {
            const stats = deviceManager.getDeviceStats();
            
            expect(stats.total).toBe(2);
            expect(stats.connected).toBe(2);
            expect(stats.restored).toBe(0);
            expect(stats.byCapability).toBeDefined();
            expect(stats.byVendor).toBeDefined();
        });

        it('should group devices by capability', () => {
            const contactDevices = deviceManager.getDevicesByCapability('BooleanStateCluster');
            const switchDevices = deviceManager.getDevicesByCapability('OnOffCluster');
            
            expect(contactDevices.length).toBeGreaterThan(0);
            expect(switchDevices.length).toBeGreaterThan(0);
        });

        it('should detect Thread environment', () => {
            const devices = deviceManager.getAllDevices();
            const hasThreadDevice = devices.some(device => device.vendorId === 4447);
            
            expect(hasThreadDevice).toBe(true);
        });
    });

    describe('error recovery and resilience', () => {
        it('should handle device connection failures', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockImplementation(() => {
                    throw new Error('Device offline');
                })
            };

            await deviceManager.addDevice('12345', mockDevice, 'Offline Device');
            
            await expect(
                deviceManager.getDeviceState('12345')
            ).rejects.toThrow();
        });

        it('should handle subscription cleanup on device removal', async () => {
            const mockDevice = {
                getDevices: jest.fn().mockReturnValue([
                    {
                        getAllClusterClients: jest.fn().mockReturnValue([
                            {
                                constructor: { name: 'BooleanStateCluster' },
                                subscribeStateValueAttribute: jest.fn().mockResolvedValue(jest.fn())
                            }
                        ])
                    }
                ])
            };

            await deviceManager.addDevice('12345', mockDevice, 'Test Device');
            await deviceManager.subscribeToDevice('12345', jest.fn());
            
            // Remove device
            await deviceManager.removeDevice('12345');
            
            // Should not be able to get device
            expect(() => {
                deviceManager.getDevice('12345');
            }).toThrow();
        });
    });
});
