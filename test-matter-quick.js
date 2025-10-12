#!/usr/bin/env node
/**
 * Quick Matter Test Script
 * Fast test of commissioned devices without interactive menu
 * 
 * Usage:
 *   node test-matter-quick.js                    # List devices
 *   node test-matter-quick.js <nodeId>           # Read device state
 *   node test-matter-quick.js <nodeId> watch     # Watch device (subscribe)
 */

const { MatterTestController } = require('./test-matter-standalone');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function main() {
    const args = process.argv.slice(2);
    const controller = new MatterTestController();

    try {
        await controller.initialize();
        console.log();

        // No arguments - list devices
        if (args.length === 0) {
            controller.listDevices();
            await controller.close();
            return;
        }

        const nodeId = args[0];
        const command = args[1];

        // Watch mode
        if (command === 'watch') {
            log(`Watching device ${nodeId} for state changes...`, colors.blue);
            log(`Press Ctrl+C to stop`, colors.yellow);
            console.log();

            await controller.subscribeToDevice(nodeId, (state) => {
                const timestamp = new Date(state.timestamp).toLocaleTimeString();
                const statusColor = state.contact === 'open' ? colors.red : colors.green;
                log(`[${timestamp}] ${state.contact.toUpperCase()}`, statusColor);
            });

            // Keep running until Ctrl+C
            await new Promise(() => {});
        } 
        // Read mode (default)
        else {
            log(`Reading device ${nodeId}...`, colors.blue);
            const state = await controller.readDeviceState(nodeId);
            
            console.log();
            log(`Device ${state.nodeId}:`, colors.cyan);
            log(`  Contact: ${state.contact}`, state.contact === 'open' ? colors.red : colors.green);
            log(`  Raw State: ${state.state}`);
            log(`  Timestamp: ${state.timestamp}`);
            console.log();

            await controller.close();
        }

    } catch (error) {
        log(`Error: ${error.message}`, colors.red);
        process.exit(1);
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log();
    log('Shutting down...', colors.yellow);
    process.exit(0);
});

main();

