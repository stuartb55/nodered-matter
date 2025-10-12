#!/usr/bin/env node
/**
 * Commission a Matter Device - Standalone Script
 * Non-interactive commissioning for automation/testing
 * Supports both initial and multi-admin commissioning
 * 
 * Usage:
 *   node test-matter-commission.js <pairing-code> [device-name] [--multi-admin]
 * 
 * Examples:
 *   node test-matter-commission.js 34970112332 "Front Door"
 *   node test-matter-commission.js MT:Y.K90IF0QA04ABCD0000
 *   node test-matter-commission.js 16425630388 "Aqara Door" --multi-admin
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
        console.log('Usage: node test-matter-commission.js <pairing-code> [device-name] [--multi-admin]');
        console.log();
        console.log('Examples:');
        console.log('  Initial commissioning:');
        console.log('    node test-matter-commission.js 34970112332 "Front Door"');
        console.log('    node test-matter-commission.js MT:Y.K90IF0QA04ABCD0000');
        console.log();
        console.log('  Multi-admin commissioning (add to existing device):');
        console.log('    node test-matter-commission.js 16425630388 "Aqara Door" --multi-admin');
        process.exit(1);
    }

    const pairingCode = args[0];
    let deviceName = '';
    let multiAdmin = false;
    
    // Parse arguments
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--multi-admin') {
            multiAdmin = true;
        } else if (!deviceName) {
            deviceName = args[i];
        }
    }

    const controller = new MatterTestController();

    try {
        log('Initializing Matter controller...', colors.blue);
        await controller.initialize();
        console.log();

        if (multiAdmin) {
            log('Multi-Admin Commissioning Mode', colors.blue);
            log('Adding Node-RED as additional fabric to existing device', colors.blue);
        } else {
            log('Initial Commissioning Mode', colors.blue);
        }
        log('This may take 30-60 seconds...', colors.blue);
        console.log();

        const options = { multiAdmin: multiAdmin };
        const nodeId = await controller.commissionDevice(pairingCode, deviceName, options);
        
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

