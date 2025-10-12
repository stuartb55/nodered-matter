# Your Aqara Device Setup - Multi-Admin Guide

## Your Scenario

You have an **Aqara door sensor** that is:
- ✅ Already paired with **Aqara Hub**
- ✅ Already paired with **Amazon Alexa**
- 🎯 Want to add **Node-RED** as well

**Good news:** This is now fully supported with multi-admin commissioning!

---

## Quick Start (5 Minutes)

### Step 1: Get Sharing Code from Aqara App

1. Open **Aqara Home** app on your phone
2. Find your door sensor
3. Tap **Settings** (gear icon) or tap the device card
4. Look for:
   - "Add to other platform" or
   - "Share device" or
   - "Connect to other ecosystem"
5. Select **Matter** as the platform
6. App will show an **11-digit code** (like `16425630388`)
7. **Keep this code ready** (it expires in 3-5 minutes)

### Step 2: Commission in Node-RED

**Option A: Using Node-RED UI**

1. Open Node-RED in your browser
2. Double-click your **Matter Controller** node (or create one)
3. In the commissioning section:
   - **Pairing Code:** Enter the 11-digit code from Aqara app
   - **Device Name:** `doortest1` (or whatever you like)
   - **☑ Multi-Admin Mode:** **CHECK THIS BOX!** ← Important!
4. Click **"Commission Device"**
5. Wait 30-60 seconds
6. Success message should appear!

**Option B: Using Test Script**

```bash
# Replace with your actual sharing code from Aqara app
node test-matter-commission.js 16425630388 "doortest1" --multi-admin
```

### Step 3: Verify It Works

**In Node-RED:**
- Add a Matter Device node
- Select the device you just commissioned
- Connect to debug node
- Deploy
- Open/close your door sensor
- You should see messages in debug panel!

**In Aqara App:**
- Open Aqara Home app
- Check device still appears
- Check it still responds
- Your automations should still work

**In Alexa:**
- Ask "Alexa, is the door open?"
- Should still work normally

---

## What Just Happened?

```
Before:
  Aqara Hub ←→ Door Sensor ←→ Alexa

After:
  Aqara Hub ↘
                Door Sensor ←→ All three work!
  Node-RED   ↗           ↖
                          Alexa
```

Your door sensor now responds to **all three controllers** simultaneously:
- ✅ Aqara Hub (keeps working)
- ✅ Alexa (keeps working)  
- ✅ Node-RED (newly added)

---

## Troubleshooting

### ❌ "Received incorrect key confirmation from the receiver"

**This is what you saw earlier!** It happened because:
- The code `16425630388` was a **commissioner/sharing code** from Aqara
- But you didn't check **"Multi-Admin Mode"** checkbox
- System tried initial commissioning instead of multi-admin

**Solution:**
1. Get a **fresh sharing code** from Aqara app (old one expired)
2. **CHECK the "Multi-Admin Mode" checkbox** in Node-RED
3. Try again with the new code

### ❌ Code Expired

Sharing codes expire quickly (3-5 minutes)

**Solution:**
1. Go back to Aqara app
2. Generate a **new sharing code**
3. Use it immediately in Node-RED

### ❌ Device Not Found

**Solution:**
1. Ensure device is powered on
2. Check it's working in Aqara app first
3. Wait 10 seconds after generating sharing code
4. Try again

---

## Testing Your Setup

### Test 1: Node-RED Reads State

```
1. Open Node-RED
2. Add inject node → matter device node → debug node
3. Click inject
4. Check debug output shows door state
```

**Expected Output:**
```json
{
  "payload": "closed",
  "state": false,
  "device": {
    "nodeId": "...",
    "type": "contact"
  }
}
```

### Test 2: Real-time Updates

```
1. Deploy a flow with matter device node
2. Enable "Output on state change"
3. Open your door
4. Check Node-RED debug panel
5. Should see "open" message immediately
```

### Test 3: All Controllers Work

```
1. Open door
2. Check Aqara app - should show "open"
3. Check Alexa - ask status
4. Check Node-RED - should show "open"
5. Close door
6. All three should update
```

---

## Building Your First Automation

### Example: Send Notification When Door Opens

```
[Matter Device] → [Switch] → [Function] → [Notification]
                    ↓
                 Check if "open"
                    ↓
                Format message
                    ↓
            Send to your phone
```

**Flow Example:**
1. Matter Device node (your door sensor)
2. Switch node:
   - Property: `msg.payload`
   - Rule: `== "open"`
3. Function node:
   - Code: `msg.payload = "Front door opened!"; return msg;`
4. Whatever notification you use (Telegram, Pushover, etc.)

---

## What You Can Do Now

### With Node-RED You Can:

1. **Complex Logic**
   - "If door open for > 5 minutes, send alert"
   - "If door opens at night, turn on lights"
   - "Count how many times door opens per day"

2. **Data Logging**
   - Log every door open/close to database
   - Create graphs of usage patterns
   - Track response times

3. **Integration**
   - Publish to MQTT
   - Send to InfluxDB/Grafana
   - Trigger webhooks
   - Control other devices

4. **Advanced Automation**
   - Combine with other sensors
   - Time-based rules
   - Presence detection
   - Weather-based logic

### Aqara & Alexa Still Work For:

- Quick status checks
- Voice control
- Native app automations
- Manufacturer features
- Family members' access

---

## Important Notes

### ✅ Do's

- ✅ Keep Aqara Hub running (it's your primary controller)
- ✅ Use same device name across systems (easier to track)
- ✅ Test Aqara app first before adding Node-RED
- ✅ Generate fresh sharing codes each time
- ✅ Check "Multi-Admin Mode" checkbox!

### ❌ Don'ts

- ❌ Don't factory reset device (breaks all connections)
- ❌ Don't remove from Aqara Hub
- ❌ Don't use device label code (use sharing code from app)
- ❌ Don't forget to check multi-admin checkbox!

---

## Next Steps

1. ✅ **Right now:** Try commissioning with multi-admin mode checked
2. ✅ **Today:** Verify all three systems work together
3. ✅ **This week:** Build your first automation in Node-RED
4. ✅ **Ongoing:** Add more devices using same method

---

## Getting Help

If you get stuck:

1. **Check the code is fresh** (< 5 minutes old from Aqara app)
2. **Verify checkbox is checked** ("Multi-Admin Mode")
3. **Try the test script** for better error messages:
   ```bash
   node test-matter-standalone.js
   # Choose option 1, then option 2 (multi-admin)
   ```
4. **Review logs** in Node-RED debug panel
5. **Read full guide:** [MULTI_ADMIN_GUIDE.md](./MULTI_ADMIN_GUIDE.md)

---

## What Changed in Your System

### Files Modified:
- `nodes/matter-controller.js` - Added multi-admin support
- `nodes/matter-controller.html` - Added checkbox and help text
- `test-matter-standalone.js` - Interactive multi-admin prompts
- `test-matter-commission.js` - Added `--multi-admin` flag

### Files Added:
- `MULTI_ADMIN_GUIDE.md` - Comprehensive guide (400+ lines)
- `validate-pairing-code.js` - Validate codes before trying
- `YOUR_AQARA_SETUP_GUIDE.md` - This file!

### All Changes Deployed:
✅ Committed to GitHub: `b769963`  
✅ Ready to use right now!

---

## Quick Command Reference

```bash
# Test with your Aqara sharing code (multi-admin)
node test-matter-commission.js <code-from-aqara> "doortest1" --multi-admin

# Interactive menu (asks about multi-admin)
node test-matter-standalone.js

# Validate a code before using
node validate-pairing-code.js <code>

# Check device status after commissioning
node test-matter-quick.js <nodeId>

# Watch device in real-time
node test-matter-quick.js <nodeId> watch
```

---

## Success Looks Like

```
✓ Aqara app shows door sensor - WORKING
✓ Alexa responds to door status - WORKING
✓ Node-RED receives door updates - WORKING
✓ All three update simultaneously - WORKING
✓ Your automations in all systems - WORKING
```

---

**You're all set!** 🎉

Get a fresh sharing code from Aqara app and try again with multi-admin mode checked!

**Your exact command:**
```bash
# 1. Get fresh code from Aqara app
# 2. Run this (replace with your actual code):
node test-matter-commission.js YOUR-CODE-HERE "doortest1" --multi-admin
```

Or use Node-RED UI with the checkbox checked! ✅

