/**
 * Unit tests for Cluster Adapters
 */

const BaseClusterAdapter = require('../../lib/clusters/base-adapter');
const BooleanStateAdapter = require('../../lib/clusters/boolean-state-adapter');
const OnOffAdapter = require('../../lib/clusters/on-off-adapter');
const LevelControlAdapter = require('../../lib/clusters/level-control-adapter');
const ClusterAdapterFactory = require('../../lib/clusters');
const { ClusterError } = require('../../lib/errors');
const { TestLogger, testFixtures } = require('../helpers');

describe('BaseClusterAdapter', () => {
    let adapter;
    let mockCluster;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        mockCluster = {
            id: 'test-cluster',
            nodeId: '12345'
        };
        adapter = new BaseClusterAdapter(mockCluster, { logger: testLogger });
    });

    afterEach(async () => {
        if (adapter) {
            await adapter.close();
        }
    });

    it('should initialize with correct options', () => {
        expect(adapter.cluster).toBe(mockCluster);
        expect(adapter.options.outputOnChange).toBe(true);
        expect(adapter.options.pollInterval).toBe(0);
    });

    it('should throw error when readState is not implemented', async () => {
        await expect(adapter.readState()).rejects.toThrow('readState() must be implemented by subclass');
    });

    it('should throw error when createSubscription is not implemented', async () => {
        await expect(adapter.createSubscription(jest.fn())).rejects.toThrow('createSubscription() must be implemented by subclass');
    });

    it('should format output correctly', () => {
        const state = { test: 'value' };
        const output = adapter.formatOutput(state);
        
        expect(output).toEqual({
            payload: state,
            timestamp: expect.any(String),
            cluster: 'BaseClusterAdapter'
        });
    });

    it('should handle polling correctly', () => {
        const callback = jest.fn();
        adapter.startPolling(callback);
        
        // Should not start polling with interval 0
        expect(adapter.pollTimer).toBeNull();
        
        adapter.options.pollInterval = 1;
        adapter.startPolling(callback);
        
        expect(adapter.pollTimer).toBeDefined();
        
        adapter.stopPolling();
        expect(adapter.pollTimer).toBeNull();
    });
});

describe('BooleanStateAdapter', () => {
    let adapter;
    let mockCluster;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        mockCluster = {
            id: 'BooleanStateCluster',
            nodeId: '12345',
            getStateValueAttribute: jest.fn().mockResolvedValue(0),
            getStateValueListAttribute: jest.fn().mockResolvedValue([]),
            subscribeStateValueAttribute: jest.fn().mockResolvedValue(jest.fn())
        };
        adapter = new BooleanStateAdapter(mockCluster, { logger: testLogger });
    });

    afterEach(async () => {
        if (adapter) {
            await adapter.close();
        }
    });

    describe('initialization', () => {
        it('should initialize successfully', async () => {
            await adapter.initialize();
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: 'BooleanStateAdapter initialized' })
            );
        });

        it('should throw error for invalid cluster', async () => {
            const invalidCluster = { id: 'InvalidCluster' };
            const invalidAdapter = new BooleanStateAdapter(invalidCluster);
            
            await expect(invalidAdapter.initialize()).rejects.toThrow(ClusterError);
        });
    });

    describe('state reading', () => {
        beforeEach(async () => {
            await adapter.initialize();
        });

        it('should read state successfully', async () => {
            const state = await adapter.readState();
            
            expect(state).toEqual({
                stateValue: 0,
                stateValueList: [],
                state: 'closed',
                raw: 0
            });
        });

        it('should handle state read errors', async () => {
            mockCluster.getStateValueAttribute.mockRejectedValue(new Error('Device offline'));
            
            await expect(adapter.readState()).rejects.toThrow(ClusterError);
        });
    });

    describe('state conversion', () => {
        it('should convert state values correctly', () => {
            expect(adapter.convertToHumanReadable(0)).toBe('closed');
            expect(adapter.convertToHumanReadable(1)).toBe('open');
            expect(adapter.convertToHumanReadable(2)).toBe(2);
        });
    });

    describe('output formatting', () => {
        it('should format output correctly for closed state', () => {
            const state = {
                stateValue: 0,
                state: 'closed',
                raw: 0,
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            
            const output = adapter.formatOutput(state);
            
            expect(output).toEqual({
                payload: 'closed',
                state: false,
                raw: 0,
                topic: 'matter/boolean-state/BooleanStateCluster',
                device: {
                    nodeId: '12345',
                    type: 'contact',
                    cluster: 'BooleanState'
                },
                timestamp: '2023-01-01T00:00:00.000Z',
                cluster: 'BooleanState'
            });
        });

        it('should format output correctly for open state', () => {
            const state = {
                stateValue: 1,
                state: 'open',
                raw: 1,
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            
            const output = adapter.formatOutput(state);
            
            expect(output).toEqual({
                payload: 'open',
                state: true,
                raw: 1,
                topic: 'matter/boolean-state/BooleanStateCluster',
                device: {
                    nodeId: '12345',
                    type: 'contact',
                    cluster: 'BooleanState'
                },
                timestamp: '2023-01-01T00:00:00.000Z',
                cluster: 'BooleanState'
            });
        });
    });

    describe('utility methods', () => {
        it('should check if device is open', () => {
            expect(adapter.isOpen({ stateValue: 1 })).toBe(true);
            expect(adapter.isOpen({ stateValue: 0 })).toBe(false);
        });

        it('should check if device is closed', () => {
            expect(adapter.isClosed({ stateValue: 0 })).toBe(true);
            expect(adapter.isClosed({ stateValue: 1 })).toBe(false);
        });

        it('should return correct device type', () => {
            expect(adapter.getDeviceType()).toBe('contact');
        });

        it('should return supported states', () => {
            expect(adapter.getSupportedStates()).toEqual(['open', 'closed']);
        });

        it('should validate state values', () => {
            expect(adapter.isValidState(0)).toBe(true);
            expect(adapter.isValidState(1)).toBe(true);
            expect(adapter.isValidState(2)).toBe(false);
            expect(adapter.isValidState('invalid')).toBe(false);
        });
    });
});

describe('OnOffAdapter', () => {
    let adapter;
    let mockCluster;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        mockCluster = {
            id: 'OnOffCluster',
            nodeId: '12345',
            getOnOffAttribute: jest.fn().mockResolvedValue(false),
            subscribeOnOffAttribute: jest.fn().mockResolvedValue(jest.fn()),
            toggle: jest.fn().mockResolvedValue()
        };
        adapter = new OnOffAdapter(mockCluster, { logger: testLogger });
    });

    afterEach(async () => {
        if (adapter) {
            await adapter.close();
        }
    });

    describe('state reading', () => {
        beforeEach(async () => {
            await adapter.initialize();
        });

        it('should read state successfully', async () => {
            const state = await adapter.readState();
            
            expect(state).toEqual({
                onOff: false,
                state: 'off',
                raw: false
            });
        });
    });

    describe('device control', () => {
        beforeEach(async () => {
            await adapter.initialize();
        });

        it('should turn on device', async () => {
            await adapter.turnOn();
            expect(mockCluster.toggle).toHaveBeenCalled();
        });

        it('should turn off device', async () => {
            await adapter.turnOff();
            expect(mockCluster.toggle).toHaveBeenCalled();
        });

        it('should toggle device', async () => {
            await adapter.toggle();
            expect(mockCluster.toggle).toHaveBeenCalled();
        });
    });

    describe('output formatting', () => {
        it('should format output correctly for off state', () => {
            const state = {
                onOff: false,
                state: 'off',
                raw: false,
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            
            const output = adapter.formatOutput(state);
            
            expect(output).toEqual({
                payload: 'off',
                state: false,
                raw: false,
                topic: 'matter/on-off/OnOffCluster',
                device: {
                    nodeId: '12345',
                    type: 'switch',
                    cluster: 'OnOff'
                },
                timestamp: '2023-01-01T00:00:00.000Z',
                cluster: 'OnOff'
            });
        });
    });
});

describe('LevelControlAdapter', () => {
    let adapter;
    let mockCluster;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        mockCluster = {
            id: 'LevelControlCluster',
            nodeId: '12345',
            getCurrentLevelAttribute: jest.fn().mockResolvedValue(127),
            getMinLevelAttribute: jest.fn().mockResolvedValue(0),
            getMaxLevelAttribute: jest.fn().mockResolvedValue(254),
            subscribeCurrentLevelAttribute: jest.fn().mockResolvedValue(jest.fn()),
            moveToLevel: jest.fn().mockResolvedValue()
        };
        adapter = new LevelControlAdapter(mockCluster, { logger: testLogger });
    });

    afterEach(async () => {
        if (adapter) {
            await adapter.close();
        }
    });

    describe('initialization', () => {
        it('should initialize with correct level range', async () => {
            await adapter.initialize();
            
            expect(adapter.options.minLevel).toBe(0);
            expect(adapter.options.maxLevel).toBe(254);
        });
    });

    describe('level conversion', () => {
        beforeEach(async () => {
            await adapter.initialize();
        });

        it('should convert level to percentage correctly', () => {
            expect(adapter.levelToPercentage(0, 0, 254)).toBe(0);
            expect(adapter.levelToPercentage(127, 0, 254)).toBe(50);
            expect(adapter.levelToPercentage(254, 0, 254)).toBe(100);
        });

        it('should convert percentage to level correctly', () => {
            expect(adapter.percentageToLevel(0)).toBe(0);
            expect(adapter.percentageToLevel(50)).toBe(127);
            expect(adapter.percentageToLevel(100)).toBe(254);
        });
    });

    describe('level control', () => {
        beforeEach(async () => {
            await adapter.initialize();
        });

        it('should set level correctly', async () => {
            await adapter.setLevel(50);
            expect(mockCluster.moveToLevel).toHaveBeenCalledWith({
                level: 127,
                transitionTime: 0
            });
        });

        it('should increase level correctly', async () => {
            mockCluster.getCurrentLevelAttribute.mockResolvedValue(127);
            await adapter.increaseLevel(10);
            expect(mockCluster.moveToLevel).toHaveBeenCalledWith({
                level: 140,
                transitionTime: 0
            });
        });

        it('should decrease level correctly', async () => {
            mockCluster.getCurrentLevelAttribute.mockResolvedValue(127);
            await adapter.decreaseLevel(10);
            expect(mockCluster.moveToLevel).toHaveBeenCalledWith({
                level: 114,
                transitionTime: 0
            });
        });
    });
});

describe('ClusterAdapterFactory', () => {
    it('should create correct adapter for BooleanStateCluster', () => {
        const mockCluster = { constructor: { name: 'BooleanStateCluster' } };
        const adapter = ClusterAdapterFactory.createAdapter(mockCluster);
        
        expect(adapter).toBeInstanceOf(BooleanStateAdapter);
    });

    it('should create correct adapter for OnOffCluster', () => {
        const mockCluster = { constructor: { name: 'OnOffCluster' } };
        const adapter = ClusterAdapterFactory.createAdapter(mockCluster);
        
        expect(adapter).toBeInstanceOf(OnOffAdapter);
    });

    it('should create correct adapter for LevelControlCluster', () => {
        const mockCluster = { constructor: { name: 'LevelControlCluster' } };
        const adapter = ClusterAdapterFactory.createAdapter(mockCluster);
        
        expect(adapter).toBeInstanceOf(LevelControlAdapter);
    });

    it('should create base adapter for unknown cluster', () => {
        const mockCluster = { constructor: { name: 'UnknownCluster' } };
        const adapter = ClusterAdapterFactory.createAdapter(mockCluster);
        
        expect(adapter).toBeInstanceOf(BaseClusterAdapter);
    });

    it('should return supported clusters', () => {
        const supported = ClusterAdapterFactory.getSupportedClusters();
        
        expect(supported).toContain('BooleanStateCluster');
        expect(supported).toContain('OnOffCluster');
        expect(supported).toContain('LevelControlCluster');
    });

    it('should check if cluster is supported', () => {
        expect(ClusterAdapterFactory.isClusterSupported('BooleanStateCluster')).toBe(true);
        expect(ClusterAdapterFactory.isClusterSupported('UnknownCluster')).toBe(false);
    });

    it('should return cluster info', () => {
        const info = ClusterAdapterFactory.getClusterInfo('BooleanStateCluster');
        
        expect(info).toEqual({
            name: 'Boolean State',
            description: 'Contact sensors, door/window sensors',
            deviceTypes: ['contact', 'sensor'],
            adapter: BooleanStateAdapter
        });
    });
});
