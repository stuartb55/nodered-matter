/**
 * Unit tests for CommissioningService
 */

const CommissioningService = require('../../lib/commissioning-service');
const { CommissioningError, ValidationError, TimeoutError } = require('../../lib/errors');
const { TestLogger, MockMatterService, testFixtures } = require('../helpers');

describe('CommissioningService', () => {
    let commissioningService;
    let matterService;
    let testLogger;

    beforeEach(() => {
        testLogger = new TestLogger();
        matterService = new MockMatterService({ logger: testLogger });
        commissioningService = new CommissioningService(matterService, { logger: testLogger });
    });

    describe('pairing code parsing', () => {
        it('should parse valid manual pairing code', () => {
            const result = commissioningService.parsePairingCode(testFixtures.validPairingCodes.manual);
            
            expect(result).toEqual({
                discriminator: 1234,
                shortDiscriminator: 1234,
                passcode: 12345678,
                vendorId: 4447,
                productId: 12345
            });
        });

        it('should parse valid QR code', () => {
            const result = commissioningService.parsePairingCode(testFixtures.validPairingCodes.qr);
            
            expect(result).toEqual({
                discriminator: 1234,
                shortDiscriminator: 1234,
                passcode: 12345678,
                vendorId: 4447,
                productId: 12345
            });
        });

        it('should throw ValidationError for invalid pairing codes', () => {
            expect(() => {
                commissioningService.parsePairingCode(testFixtures.invalidPairingCodes.tooShort);
            }).toThrow(ValidationError);

            expect(() => {
                commissioningService.parsePairingCode(testFixtures.invalidPairingCodes.invalidChars);
            }).toThrow(ValidationError);

            expect(() => {
                commissioningService.parsePairingCode(testFixtures.invalidPairingCodes.empty);
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for null/undefined pairing code', () => {
            expect(() => {
                commissioningService.parsePairingCode(null);
            }).toThrow(ValidationError);

            expect(() => {
                commissioningService.parsePairingCode(undefined);
            }).toThrow(ValidationError);
        });
    });

    describe('network type detection', () => {
        it('should detect Thread devices by vendor ID', () => {
            const threadData = testFixtures.commissioningData.aqaraThread;
            const networkType = commissioningService.detectNetworkType(threadData);
            
            expect(networkType).toBe('thread');
        });

        it('should detect WiFi devices for other vendors', () => {
            const wifiData = testFixtures.commissioningData.wifiDevice;
            const networkType = commissioningService.detectNetworkType(wifiData);
            
            expect(networkType).toBe('wifi');
        });
    });

    describe('timeout configuration', () => {
        it('should return correct timeout for Thread devices', () => {
            const timeout = commissioningService.getTimeoutForNetworkType('thread');
            expect(timeout).toBe(120); // 2 minutes for Thread
        });

        it('should return correct timeout for WiFi devices', () => {
            const timeout = commissioningService.getTimeoutForNetworkType('wifi');
            expect(timeout).toBe(60); // 1 minute for WiFi
        });
    });

    describe('device commissioning', () => {
        beforeEach(async () => {
            await matterService.initialize();
        });

        it('should commission device successfully', async () => {
            const result = await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Test Device',
                { multiAdmin: false }
            );

            expect(result).toEqual({
                success: true,
                nodeId: '12345',
                message: 'Device commissioned successfully',
                multiAdmin: false,
                networkType: 'thread',
                commissioningData: expect.objectContaining({
                    discriminator: 1234,
                    vendorId: 4447,
                    productId: 12345
                })
            });
        });

        it('should handle multi-admin commissioning', async () => {
            const result = await commissioningService.commissionDevice(
                testFixtures.validPairingCodes.manual,
                'Test Device',
                { multiAdmin: true }
            );

            expect(result.multiAdmin).toBe(true);
            expect(result.message).toContain('multi-admin');
        });

        it('should throw error when MatterService not initialized', async () => {
            const uninitializedService = new MockMatterService();
            const uninitializedCommissioning = new CommissioningService(uninitializedService);

            await expect(
                uninitializedCommissioning.commissionDevice('12345678901', 'Test Device')
            ).rejects.toThrow(CommissioningError);
        });

        it('should provide specific error messages for key confirmation failures', async () => {
            // Mock commissionNode to throw key confirmation error
            const mockController = {
                commissionNode: jest.fn().mockRejectedValue(new Error('key confirmation failed'))
            };
            
            matterService.getCommissioningController = jest.fn().mockReturnValue(mockController);

            await expect(
                commissioningService.commissionDevice('12345678901', 'Test Device', { multiAdmin: true })
            ).rejects.toThrow(CommissioningError);
        });

        it('should provide specific error messages for device discovery failures', async () => {
            // Mock commissionNode to throw discovery error
            const mockController = {
                commissionNode: jest.fn().mockRejectedValue(new Error('No device discovered'))
            };
            
            matterService.getCommissioningController = jest.fn().mockReturnValue(mockController);

            await expect(
                commissioningService.commissionDevice('12345678901', 'Test Device')
            ).rejects.toThrow(CommissioningError);
        });
    });

    describe('commissioning statistics', () => {
        it('should return commissioning stats', () => {
            const stats = commissioningService.getCommissioningStats();
            
            expect(stats).toEqual({
                timeouts: {
                    thread: 120,
                    wifi: 60,
                    discovery: 30
                },
                networkTypes: ['thread', 'wifi'],
                supportedVendors: {
                    4447: 'Aqara (Thread)'
                }
            });
        });
    });

    describe('commissioning data validation', () => {
        it('should validate complete commissioning data', () => {
            const validData = {
                discriminator: 1234,
                passcode: 12345678
            };
            
            expect(() => {
                commissioningService.validateCommissioningData(validData);
            }).not.toThrow();
        });

        it('should throw ValidationError for incomplete commissioning data', () => {
            const invalidData = {
                discriminator: 1234
                // Missing passcode
            };
            
            expect(() => {
                commissioningService.validateCommissioningData(invalidData);
            }).toThrow(ValidationError);
        });
    });
});
