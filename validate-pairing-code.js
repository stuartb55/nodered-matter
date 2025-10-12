#!/usr/bin/env node
/**
 * Validate Matter Pairing Code Format
 * Checks if a pairing code is valid before attempting to commission
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function validatePairingCode(code) {
    console.log('\n=== Pairing Code Validation ===\n');
    console.log(`Input: "${code}"`);
    console.log(`Length: ${code.length}`);
    console.log();

    // QR Code format
    if (code.startsWith('MT:')) {
        console.log('✓ Format: QR Code');
        console.log('✓ This appears to be valid');
        
        try {
            const { QrPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
            const data = QrPairingCodeCodec.decode(code);
            console.log('✓ Successfully decoded!');
            console.log(`  Discriminator: ${data.discriminator}`);
            console.log(`  Vendor ID: ${data.vendorId}`);
            console.log(`  Product ID: ${data.productId}`);
            return true;
        } catch (error) {
            console.log(`✗ Decoding failed: ${error.message}`);
            return false;
        }
    }
    
    // Manual code format
    const cleanCode = code.replace(/-/g, '').replace(/\s/g, '');
    console.log(`Cleaned: "${cleanCode}"`);
    
    if (!/^\d{8,11}$/.test(cleanCode)) {
        console.log('✗ Format: Invalid');
        console.log('  Manual codes should be 8-11 digits');
        console.log('  Example: 34970112332 or 1642-563-0388');
        return false;
    }
    
    console.log('✓ Format: Manual Pairing Code');
    console.log(`✓ Digit count: ${cleanCode.length} (valid)`);
    
    try {
        const { ManualPairingCodeCodec } = require("@project-chip/matter-node.js/schema");
        const data = ManualPairingCodeCodec.decode(cleanCode);
        console.log('✓ Successfully decoded!');
        console.log(`  Discriminator: ${data.discriminator || 'short: ' + data.shortDiscriminator}`);
        console.log(`  Passcode: ${data.passcode}`);
        console.log();
        console.log('✓ This code appears to be VALID');
        console.log('  You can try commissioning with this code.');
        return true;
    } catch (error) {
        console.log(`✗ Decoding failed: ${error.message}`);
        console.log();
        console.log('Possible issues:');
        console.log('  • Code has invalid checksum');
        console.log('  • Code is not a valid Matter pairing code');
        console.log('  • Code might be transcribed incorrectly');
        console.log();
        console.log('Please double-check the code on your device.');
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Code provided as argument
        validatePairingCode(args[0]);
        process.exit(0);
    }
    
    // Interactive mode
    console.log('Matter Pairing Code Validator');
    console.log('============================\n');
    
    rl.question('Enter pairing code to validate: ', (code) => {
        if (!code.trim()) {
            console.log('No code provided');
            rl.close();
            return;
        }
        
        validatePairingCode(code.trim());
        rl.close();
    });
}

main();

