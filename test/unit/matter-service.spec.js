/**
 * Unit tests for MatterService
 */

const MatterService = require('../../lib/matter-service');
const { ConfigurationError, NetworkError } = require('../../lib/errors');
const { TestLogger } = require('../helpers');

describe('MatterService', () => {
    let matterService;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        matterService = new MatterService({
            storageDir: '/tmp/test-matter',
            controllerName: 'Test Controller',
            logger: testLogger
        });
    });

    afterEach(async () => {
        if (matterService && matterService.isServiceInitialized()) {
            await matterService.close();
        }
    });

    describe('initialization', () => {
        it('should initialize successfully with valid options', async () => {
            await matterService.initialize();
            
            expect(matterService.isServiceInitialized()).toBe(true);
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: 'MatterService initialized successfully' })
            );
        });

        it('should throw ConfigurationError on initialization failure', async () => {
            // Mock fs.existsSync to throw error
            const fs = require('fs');
            fs.existsSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            await expect(matterService.initialize()).rejects.toThrow(ConfigurationError);
        });

        it('should not initialize twice', async () => {
            await matterService.initialize();
            await matterService.initialize(); // Second call should be ignored
            
            expect(testLogger.getLogs('warn')).toContainEqual(
                expect.objectContaining({ message: 'MatterService already initialized' })
            );
        });
    });

    describe('service state', () => {
        beforeEach(async () => {
            await matterService.initialize();
        });

        it('should return correct initialization status', () => {
            expect(matterService.isServiceInitialized()).toBe(true);
        });

        it('should provide network info', () => {
            const networkInfo = matterService.getNetworkInfo();
            
            expect(networkInfo).toEqual({
                mdns: expect.objectContaining({
                    enableIpv4: true,
                    enableIpv6: true
                }),
                storageDir: '/tmp/test-matter',
                initialized: true,
                controllerName: 'Test Controller'
            });
        });

        it('should perform health check', async () => {
            const health = await matterService.healthCheck();
            
            expect(health).toEqual({
                status: 'healthy',
                healthy: true,
                networkInfo: expect.any(Object)
            });
        });
    });

    describe('commissioning controller', () => {
        beforeEach(async () => {
            await matterService.initialize();
        });

        it('should return commissioning controller when initialized', () => {
            const controller = matterService.getCommissioningController();
            expect(controller).toBeDefined();
        });

        it('should throw error when not initialized', () => {
            const uninitializedService = new MatterService();
            
            expect(() => uninitializedService.getCommissioningController()).toThrow(ConfigurationError);
        });
    });

    describe('cleanup', () => {
        it('should close service properly', async () => {
            await matterService.initialize();
            await matterService.close();
            
            expect(matterService.isServiceInitialized()).toBe(false);
            expect(testLogger.getLogs('info')).toContainEqual(
                expect.objectContaining({ message: 'MatterService closed successfully' })
            );
        });

        it('should handle close when not initialized', async () => {
            await matterService.close(); // Should not throw
        });
    });
});
