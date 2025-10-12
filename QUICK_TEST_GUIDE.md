# Quick Testing Guide - 5 Minute Start

## 🚀 Getting Started in 5 Minutes

You can now test Matter functionality **without running Node-RED!**

### Three Ways to Test:

```
1. test-matter-standalone.js   → Full interactive menu
2. test-matter-quick.js        → Fast command-line tool  
3. test-matter-commission.js   → Commission devices quickly
```

---

## Method 1: Interactive Testing (Recommended for First Time)

### Start the Interactive Menu:

```bash
node test-matter-standalone.js
```

You'll see:

```
==================================================
Matter Test Controller - Main Menu
==================================================

  1. Commission new device
  2. List commissioned devices
  3. Read device state
  4. Subscribe to device updates
  5. Exit

Enter your choice (1-5):
```

### Walkthrough:

**Step 1:** Commission a device
- Choose option `1`
- Enter your pairing code when prompted
- Wait 30-60 seconds
- Note the NodeId that's assigned (e.g., "12345")

**Step 2:** Read the device state
- Choose option `3`
- Enter the NodeId from step 1
- See current state (open/closed)

**Step 3:** Watch for changes
- Choose option `4`
- Enter the NodeId
- Open/close your device
- See real-time updates!
- Press Enter to stop

**Step 4:** Exit
- Choose option `5`

---

## Method 2: Quick Command-Line Tool

### List All Devices:
```bash
node test-matter-quick.js
```

Output:
```
Commissioned Devices:
  • NodeId: 12345
    Name: Front Door
    Connected: ✓
    Commissioned: 2025-10-12T11:23:45.123Z
```

### Read Device State:
```bash
node test-matter-quick.js 12345
```

Output:
```
Device 12345:
  Contact: closed
  Raw State: false
  Timestamp: 2025-10-12T11:30:00.000Z
```

### Watch Device (Live Updates):
```bash
node test-matter-quick.js 12345 watch
```

Output:
```
Watching device 12345 for state changes...
Press Ctrl+C to stop

[11:30:15] CLOSED
[11:30:42] OPEN
[11:31:08] CLOSED
```

Press `Ctrl+C` to stop watching.

---

## Method 3: Commission Devices Quickly

### Commission with Pairing Code:
```bash
node test-matter-commission.js 34970112332
```

### Commission with Name:
```bash
node test-matter-commission.js 34970112332 "Front Door"
```

### Commission with QR Code:
```bash
node test-matter-commission.js MT:Y.K90IF0QA04ABCD0000
```

Output:
```
Initializing Matter controller...
✓ Matter controller initialized successfully

Starting commissioning process...
This may take 30-60 seconds...

✓ SUCCESS!
Device commissioned with NodeId: 12345
Device name: Front Door

Reading initial device state...
  Contact: closed

Done!
```

---

## Common Use Cases

### Use Case 1: Debug a Device

```bash
# Check if device is responding
node test-matter-quick.js 12345

# If it responds, device is good
# If it fails, device may be offline
```

### Use Case 2: Monitor Door Sensor

```bash
# Leave this running in a terminal
node test-matter-quick.js 12345 watch

# Open/close door and see instant updates
```

### Use Case 3: Test Before Using in Node-RED

```bash
# 1. Commission device
node test-matter-commission.js 34970112332 "Test Sensor"

# 2. Verify it works
node test-matter-quick.js <nodeId>

# 3. Watch for a bit to ensure stability
node test-matter-quick.js <nodeId> watch

# 4. If all good, use same pairing code in Node-RED
```

### Use Case 4: Quick Status Check

```bash
# Check all devices at once
node test-matter-quick.js

# Shows which devices are connected/disconnected
```

---

## Tips & Tricks

### 💡 Tip 1: Run in Separate Storage
Test scripts use `.matter-test-storage/` directory, separate from Node-RED's `.node-red-matter/` directory. This means:
- ✅ Won't interfere with Node-RED
- ✅ Can test without breaking production
- ✅ Clean slate for testing

### 💡 Tip 2: Use Watch Mode for Development
When developing Matter integrations:
```bash
# Terminal 1: Watch device
node test-matter-quick.js 12345 watch

# Terminal 2: Make code changes and test
# See results instantly in Terminal 1
```

### 💡 Tip 3: Colors Help
- 🟢 Green = Success, device closed
- 🔴 Red = Error, device open  
- 🟡 Yellow = Warning
- 🔵 Blue = Info

### 💡 Tip 4: Quick Commissioning
Save frequently used pairing codes:
```bash
# Create a quick script
echo 'node test-matter-commission.js 34970112332 "Front Door"' > commission-front-door.sh
chmod +x commission-front-door.sh
./commission-front-door.sh
```

---

## Troubleshooting

### Script Won't Start
```bash
# Make sure dependencies are installed
npm install

# Try again
node test-matter-standalone.js
```

### Device Not Found
```bash
# List devices to get correct NodeId
node test-matter-quick.js

# Use exact NodeId shown
node test-matter-quick.js 12345
```

### Commissioning Fails
1. **Ensure device is in pairing mode** (LED blinking)
2. **Check pairing code is correct**
3. **Move device closer** during commissioning
4. **Try again** - sometimes it takes 2-3 attempts

### "Permission Denied" Error
```bash
# Windows - Run as Administrator
# Linux/Mac:
sudo chown -R $USER:$USER .matter-test-storage/
```

---

## Comparison: Test Scripts vs Node-RED

| Feature | Test Scripts | Node-RED |
|---------|-------------|----------|
| **Speed** | ⚡ Fast (seconds) | Slower (restart needed) |
| **Debugging** | 🔍 Easy (console) | Harder (log files) |
| **Automation** | ✅ Scriptable | Manual clicks |
| **UI** | Terminal | Visual flows |
| **Production** | ❌ Not for production | ✅ For production |

**Use test scripts for:**
- Development and testing
- Debugging issues
- Quick checks
- Learning Matter

**Use Node-RED for:**
- Production deployments
- Complex automations
- Visual flow building
- Integration with other nodes

---

## Next Steps

1. **Try the interactive script** to get familiar:
   ```bash
   node test-matter-standalone.js
   ```

2. **Commission a test device** to verify everything works

3. **Use quick script** for daily checks:
   ```bash
   node test-matter-quick.js
   ```

4. **Read full guide** in [README_TESTING.md](./README_TESTING.md)

---

## Examples in Action

### Example: Complete Test Session

```bash
# 1. Start interactive mode
node test-matter-standalone.js

# 2. From menu, commission device
Choose: 1
Enter code: 34970112332
Enter name: Front Door
Wait...
✓ Device commissioned with NodeId: 12345

# 3. Test reading state
Choose: 3
Enter NodeId: 12345
Device State:
  Contact: closed

# 4. Watch for changes
Choose: 4
Enter NodeId: 12345
[Trigger device]
Device State Update:
  Contact: open

# 5. Exit
Choose: 5
```

### Example: Automated Testing Script

```bash
#!/bin/bash
# test-all-my-devices.sh

echo "Testing all devices..."

# Test front door
echo "Front door:"
node test-matter-quick.js 12345

# Test back door
echo "Back door:"
node test-matter-quick.js 67890

echo "All tests complete!"
```

---

## Getting Help

- **Full documentation**: [README_TESTING.md](./README_TESTING.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Code review**: [PEER_REVIEW.md](./PEER_REVIEW.md)
- **GitHub issues**: https://github.com/stuartb55/nodered-matter/issues

---

**Ready to test? Start here:**

```bash
node test-matter-standalone.js
```

🎉 **Happy Testing!**

