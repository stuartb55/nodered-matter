# Matter Multi-Admin Commissioning - Fixed Guide

## ✅ Bug Fixed

The `isMultiAdmin is not defined` error has been fixed in the test script.

## Understanding Matter Multi-Admin

**Multi-admin** allows a Matter device to be controlled by multiple controllers (fabrics) simultaneously. For example:
- Your device stays connected to Aqara
- AND you can also control it from Node-RED
- Both controllers work at the same time

## How to Commission with Multi-Admin

### Step 1: Put Device in Commissioning Window (from Aqara App)

The device must already be paired with Aqara. Then:

1. **Open Aqara Home app**
2. **Go to your device** (door sensor)
3. **Look for one of these options:**
   - "Add to Another Platform" 
   - "Share Device"
   - "Multi-Admin" or "Commissioner"
   - Or device settings → "Thread" or "Matter" settings

4. **Enable commissioning window** - this makes the device discoverable again

### Step 2: Get the Pairing Code

There are typically two ways to get the code:

#### Option A: Use Original Device Code
- Some devices work with the **original 11-digit pairing code** (printed on the device)
- This is what you tried: `03753213995`

#### Option B: Generate New Commissioning Code
- Some apps generate a **new temporary code** for multi-admin
- This code is time-limited (usually 3-15 minutes)
- Look in Aqara app for "Generate code" or similar

### Step 3: Commission in Node-RED (or Test Script)

```bash
# Run the test script
node test-matter-standalone.js

# Choose:
# 1. Commission new device
# 2. Multi-admin (option 2)
# 3. Enter the code
```

## Common Issues & Solutions

### Issue 1: "Incorrect pairing code" Error

**Possible causes:**
1. **Wrong code** - You need the code FROM Aqara app, not necessarily the device's printed code
2. **Commissioning window not open** - Device must be in commissioning mode
3. **Commissioning window expired** - Typically 3-15 minutes, try again
4. **Device not in multi-admin mode** - Some devices require factory reset for first multi-admin

**Solution:**
- Generate a **fresh commissioning code** from Aqara app
- Make sure device is in **commissioning window mode**
- Complete commissioning within the time limit (usually 3-15 minutes)

### Issue 2: Device Not Found

**Possible causes:**
- Device not on same network
- mDNS not working
- Commissioning window closed

**Solution:**
```bash
# Check if device is advertising
dns-sd -B _matterc._udp local

# Or use Matter tool
node test-matter-standalone.js
# See if device appears in scan
```

### Issue 3: Works in Aqara but Not Multi-Admin

Some Aqara devices have specific requirements:
- May need **firmware update** first
- May require **Thread border router** to be active
- Check Aqara documentation for multi-admin support

## Alternative: Initial Commissioning (Factory Reset)

If multi-admin keeps failing, you can do **initial commissioning** instead:

### Pros:
- More reliable
- Uses device's printed code directly
- Simpler process

### Cons:
- **Device is removed from Aqara**
- You lose Aqara automations
- Need to factory reset device

### How to do it:
1. **Factory reset your device** (check Aqara manual)
2. Run test script: `node test-matter-standalone.js`
3. Choose **"Initial commissioning"** (option 1)
4. Enter the **device's printed code**: `03753213995`
5. Complete commissioning

## Testing Your Fix

Now that the code bug is fixed, try commissioning again:

```bash
cd /Users/stuart.bolton/Cursor/nodered-matter
node test-matter-standalone.js
```

### Success Indicators:
- Device found via mDNS ✓ (you had this!)
- Message exchanges complete ✓ (you got to this point!)
- NodeId assigned ✓ (this is where it failed)

### Your Previous Attempt:
Looking at your logs:
- ✅ Device was found: `Found commissionable device`
- ✅ Communication started: Multiple message exchanges
- ❌ PASE failed: "Incorrect pairing code"

This suggests the **code** is now working, but you need the **correct commissioning code from Aqara app**.

## Recommended Next Steps

1. **Open Aqara Home app**
2. **Find the "Add to another platform" or "Commissioner" option**
3. **Generate a new commissioning code** (if available)
4. **Note the time limit** (usually shows countdown)
5. **Immediately run the test script** and enter that code
6. **Choose multi-admin option**

OR

If Aqara doesn't provide a clear multi-admin option:
1. **Try initial commissioning with factory reset**
2. This is more reliable for first-time Matter setup
3. You can always add Aqara back later if needed

## Checking Aqara Multi-Admin Support

Not all Aqara devices support multi-admin. Check:
1. Device firmware version (update if old)
2. Aqara documentation for your specific model
3. Matter compatibility (should be Matter 1.0 or later)

Your device **does support Thread/Matter** (logs show it's advertising), so it should support multi-admin. The issue is likely just getting the right code at the right time.

## Quick Test Command

After the fix:

```bash
# Test the fix
cd /Users/stuart.bolton/Cursor/nodered-matter
node test-matter-standalone.js

# When it asks, choose:
# 1 = Initial commissioning (factory reset device first)
# 2 = Multi-admin (get code from Aqara app first)
```

Good luck! The code bug is fixed, now it's just about getting the right commissioning code from Aqara. 🚀
