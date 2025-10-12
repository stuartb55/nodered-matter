#!/usr/bin/env node
/**
 * Commission a Matter Device - Standalone Script
 * Non-interactive commissioning for automation/testing
 * 
 * Usage:
 *   node test-matter-commission.js <pairing-code> [device-name]
 * 
 * Examples:
 *   node test-matter-commission.js 34970112332 "Front Door"
 *   node test-matter-commission.js MT:Y.K90IF0QA04ABCD0000
 */

const { MatterTestController } = require('./test-matter-standalone');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node test-matter-commission.js <pairing-code> [device-name]');
        console.log();
        console.log('Examples:');
        console.log('  node test-matter-commission.js 34970112332 "Front Door"');
        console.log('  node test-matter-commission.js MT:Y.K90IF0QA04ABCD0000');
        process.exit(1);
    }

    const pairingCode = args[0];
    const deviceName = args[1] || '';

    const controller = new MatterTestController();

    try {
        log('Initializing Matter controller...', colors.blue);
        await controller.initialize();
        console.log();

        log('Starting commissioning process...', colors.blue);
        log('This may take 30-60 seconds...', colors.blue);
        console.log();

        const nodeId = await controller.commissionDevice(pairingCode, deviceName);
        
        console.log();
        log('✓ SUCCESS!', colors.green);
        log(`Device commissioned with NodeId: ${nodeId}`, colors.green);
        if (deviceName) {
            log(`Device name: ${deviceName}`, colors.green);
        }
        console.log();

        // Try to read initial state
        try {
            log('Reading initial device state...', colors.blue);
            const state = await controller.readDeviceState(nodeId);
            log(`  Contact: ${state.contact}`, state.contact === 'open' ? colors.red : colors.green);
        } catch (err) {
            log(`Could not read initial state: ${err.message}`, colors.red);
        }

        await controller.close();
        log('\nDone!', colors.green);

    } catch (error) {
        console.log();
        log(`✗ FAILED: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    }
}

main();

