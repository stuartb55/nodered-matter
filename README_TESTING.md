# Testing Matter Code Outside Node-RED

This directory contains standalone test scripts that allow you to test the Matter.js functionality without running Node-RED.

## Why Test Outside Node-RED?

- **Faster iteration** - No need to restart Node-RED for each test
- **Easier debugging** - Direct console output and error messages
- **Isolated testing** - Test Matter functionality independently
- **Development** - Build and test before integrating with Node-RED
- **Troubleshooting** - Diagnose issues without Node-RED overhead

## Test Scripts

### 1. Interactive Test Controller

**File:** `test-matter-standalone.js`

Full interactive menu for testing all Matter operations.

```bash
node test-matter-standalone.js
```

**Features:**
- Commission new devices
- List commissioned devices
- Read device states
- Subscribe to device updates
- Full interactive menu

**Use when:** You want to explore and test manually

---

### 2. Quick Device Reader

**File:** `test-matter-quick.js`

Fast command-line tool for reading device states.

```bash
# List all devices
node test-matter-quick.js

# Read specific device state
node test-matter-quick.js 12345

# Watch device for changes (live monitoring)
node test-matter-quick.js 12345 watch
```

**Use when:** You need quick status checks or monitoring

---

### 3. Commission Device Script

**File:** `test-matter-commission.js`

Non-interactive commissioning for automation.

```bash
# Commission with pairing code only
node test-matter-commission.js 34970112332

# Commission with name
node test-matter-commission.js 34970112332 "Front Door"

# Commission with QR code
node test-matter-commission.js MT:Y.K90IF0QA04ABCD0000
```

**Use when:** You need to script commissioning or batch operations

---

## Setup

### 1. Install Dependencies

Dependencies are already installed if you ran `npm install` in the main directory:

```bash
npm install
```

The test scripts use the same dependencies as the Node-RED nodes:
- `@project-chip/matter-node.js`
- `@project-chip/matter.js`

### 2. Make Scripts Executable (Linux/Mac)

```bash
chmod +x test-matter-*.js
```

### 3. Run Tests

```bash
node test-matter-standalone.js
```

---

## Storage

Test scripts use a separate storage directory to avoid conflicts with Node-RED:

**Test Storage:** `.matter-test-storage/`  
**Node-RED Storage:** `.node-red-matter/`

This means:
- Test commissioning won't affect Node-RED devices
- You can test without breaking your Node-RED setup
- Each environment is isolated

**Note:** Devices commissioned in test scripts won't automatically appear in Node-RED (and vice versa).

---

## Usage Examples

### Example 1: Commission and Monitor a Door Sensor

```bash
# Step 1: Put device in pairing mode

# Step 2: Commission it
node test-matter-commission.js 34970112332 "Front Door"

# Step 3: Watch for state changes
node test-matter-quick.js <nodeId-from-step-2> watch

# Step 4: Open/close the door and see updates
```

### Example 2: Interactive Testing Session

```bash
node test-matter-standalone.js

# From menu:
# 1. Commission device (enter pairing code)
# 2. List devices (note the NodeId)
# 3. Read device state
# 4. Subscribe to updates (leave running)
# Trigger device to see updates
# Press Enter to stop subscription
# 5. Exit
```

### Example 3: Quick Status Check

```bash
# Check all devices
node test-matter-quick.js

# Output:
# Commissioned Devices:
#   • NodeId: 12345
#     Name: Front Door
#     Connected: ✓
#     Commissioned: 2025-10-12T...
```

### Example 4: Continuous Monitoring

```bash
# Monitor device continuously (Ctrl+C to stop)
node test-matter-quick.js 12345 watch

# Output:
# [12:34:56] CLOSED
# [12:35:12] OPEN
# [12:35:18] CLOSED
```

---

## Troubleshooting

### Device Not Found

If device is commissioned in Node-RED but not visible in test scripts:

```bash
# They use different storage directories
# To test Node-RED devices, modify STORAGE_DIR in test scripts:
const STORAGE_DIR = path.join(os.homedir(), ".node-red", ".node-red-matter");
```

### Commissioning Fails

1. **Ensure device is in pairing mode**
   - Check device LED is blinking
   - Refer to device manual for pairing instructions

2. **Check pairing code is valid**
   ```bash
   # QR codes start with MT:
   # Manual codes are 11 digits
   ```

3. **Try from interactive menu** for better error messages
   ```bash
   node test-matter-standalone.js
   # Choose option 1
   ```

### Permission Errors

If you get storage permission errors:

```bash
# Check storage directory
ls -la .matter-test-storage/

# Fix permissions if needed
chmod -R 755 .matter-test-storage/
```

### Device Shows as Disconnected

If device was commissioned but shows disconnected:

1. **Check device is powered on**
2. **Ensure device is in range**
3. **Try reading state** - may reconnect automatically
4. **Re-commission if necessary**

---

## Testing Workflow

### Development Testing

1. **Write new feature** in test script first
2. **Test independently** without Node-RED
3. **Debug and refine** with direct console output
4. **Port to Node-RED** once working
5. **Verify in Node-RED**

### Debugging Issues

1. **Reproduce in test script** first
2. **Add logging** in test script
3. **Fix issue** in test script
4. **Apply fix** to Node-RED nodes
5. **Verify both** work

### Continuous Monitoring

```bash
# Terminal 1: Watch device
node test-matter-quick.js 12345 watch

# Terminal 2: Manual tests
node test-matter-quick.js 12345  # Read state
node test-matter-quick.js        # List devices
```

---

## Advanced Usage

### Custom Test Script

Create your own test script:

```javascript
const { MatterTestController } = require('./test-matter-standalone');

async function myTest() {
    const controller = new MatterTestController();
    await controller.initialize();
    
    // Your test code here
    const state = await controller.readDeviceState('12345');
    console.log('Device state:', state);
    
    await controller.close();
}

myTest();
```

### Automated Testing

```bash
#!/bin/bash
# test-all-devices.sh

# Read all devices and check they respond
for nodeId in $(node test-matter-quick.js | grep 'NodeId:' | awk '{print $3}'); do
    echo "Testing device $nodeId..."
    node test-matter-quick.js $nodeId || echo "FAILED: $nodeId"
done
```

### Integration with CI/CD

```yaml
# .github/workflows/test-matter.yml
name: Test Matter Devices

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node test-matter-quick.js  # List devices
      # Add more tests as needed
```

---

## Differences from Node-RED

| Feature | Test Scripts | Node-RED Nodes |
|---------|-------------|----------------|
| Storage | `.matter-test-storage/` | `.node-red-matter/` |
| Logging | Console output | Node-RED debug log |
| UI | Terminal/CLI | Visual flow editor |
| Status | Text output | Node status indicators |
| Integration | Standalone | Part of flows |
| Restart | Fast (seconds) | Slower (restart Node-RED) |

---

## Tips

1. **Use quick script for monitoring** - `test-matter-quick.js watch` is great for debugging
2. **Use interactive for exploration** - `test-matter-standalone.js` when learning
3. **Use commission script for automation** - `test-matter-commission.js` for batch setup
4. **Check logs carefully** - More verbose than Node-RED
5. **One test at a time** - Don't run multiple scripts simultaneously
6. **Keep terminal open** - Closing kills subscriptions

---

## Color Output

Test scripts use ANSI colors for better readability:

- 🟢 **Green** - Success, device closed
- 🔴 **Red** - Errors, device open
- 🟡 **Yellow** - Warnings
- 🔵 **Blue** - Info messages
- 🟦 **Cyan** - Device IDs

If colors don't display correctly:
```bash
# Windows Command Prompt - enable ANSI colors
# Run in PowerShell:
Set-ItemProperty HKCU:\Console VirtualTerminalLevel -Type DWORD 1
```

---

## Next Steps

1. **Try the interactive script** to get familiar
2. **Commission a test device** to verify everything works
3. **Use quick script** for daily development
4. **Create custom scripts** for your specific needs
5. **Share results** and report any issues

---

## Files Summary

| File | Purpose | Interactive | Use Case |
|------|---------|-------------|----------|
| `test-matter-standalone.js` | Full featured | Yes | Exploration, learning |
| `test-matter-quick.js` | Fast operations | No | Quick checks, monitoring |
| `test-matter-commission.js` | Commissioning | No | Automation, scripting |
| `.matter-test-storage/` | Test storage | - | Isolated from Node-RED |

---

## Support

If you encounter issues:

1. Check the main [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [PEER_REVIEW.md](./PEER_REVIEW.md) for known issues
3. Run with `NODE_DEBUG=matter` for verbose logging:
   ```bash
   NODE_DEBUG=matter node test-matter-standalone.js
   ```
4. Open an issue on GitHub with:
   - Script you're running
   - Error messages
   - Device type
   - Steps to reproduce

---

**Happy Testing! 🚀**

