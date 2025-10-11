# Usage Notes - Matter Door Contact Sensor

## Your Specific Use Case: Door Contact Sensor

You mentioned you have a Matter door contact sensor. Here's exactly how to get it working:

## What You Need

1. ✅ Your Matter door contact sensor
2. ✅ The Matter pairing code (on device sticker or manual)
3. ✅ This Node-RED plugin (already installed)
4. ✅ Node-RED running on your system

## Step-by-Step for Your Door Sensor

### Step 1: Install in Node-RED

From your Node-RED installation directory:

```bash
cd ~/.node-red
npm install /c/Users/stuar/Cursor/noderedmatter
```

Then restart Node-RED.

### Step 2: Put Sensor in Pairing Mode

**For most door sensors:**
- Remove the battery cover
- Hold the pairing button for 3-5 seconds
- LED should blink indicating pairing mode
- Or follow your specific sensor's instructions

### Step 3: Get the Pairing Code

Your pairing code is typically found:
- On a sticker inside the battery compartment
- On the back of the sensor
- In the original packaging
- In the manufacturer's app

It looks like: `34970112332` (11 digits) or a QR code

### Step 4: Add to Node-RED

1. Open Node-RED (http://localhost:1880)
2. In the palette, find "matter device" under "Matter" category
3. Drag it onto the canvas
4. Double-click to configure:
   - Click pencil icon next to Controller
   - Name: "My Matter Controller"
   - In "Commission New Device" section:
     - Pairing Code: [enter your code]
     - Device Name: "Front Door Sensor" (or whatever you prefer)
   - Click "Commission Device"
   - **Wait 30-60 seconds** - this is important!
   - You should see: "✓ Device commissioned successfully"
   - Click "Done"
5. Back in the device node config:
   - Controller: Select "My Matter Controller"
   - Device: Select your sensor from dropdown
   - Type: "Contact Sensor"
   - Output on state change: ✓ (checked)
   - Click "Done"

### Step 5: Add Debug Output

1. Drag a "debug" node onto the canvas
2. Connect: matter device output → debug input
3. Click "Deploy" (top right)
4. Open Debug panel (bug icon on right sidebar)

### Step 6: Test Your Sensor

**Test it:**
- Open your door
- Watch the debug panel
- You should see: `{"payload": "open", ...}`

- Close your door
- Watch the debug panel
- You should see: `{"payload": "closed", ...}`

## Understanding the Output

Every time your door opens or closes, you'll receive:

```json
{
  "payload": "open",              // "open" or "closed"
  "state": true,                  // true=open, false=closed
  "topic": "matter/12345",        // unique ID for your sensor
  "device": {
    "nodeId": "12345",
    "type": "contact"
  },
  "timestamp": "2025-10-11T12:34:56.789Z"
}
```

## Building Automation

Now that you have the data, here are some ideas:

### Example 1: Door Open Alert

```
[matter device] → [switch: if payload="open"] → [notification]
```

### Example 2: Log When Door Opens

```
[matter device] → [change: set timestamp] → [file: append to log]
```

### Example 3: Turn on Light When Door Opens

```
[matter device] → [switch: if payload="open"] → [smart light node]
```

### Example 4: Track Door State

```
[matter device] → [function: count opens] → [dashboard gauge]
```

## Tips for Your Door Sensor

### Battery Life
- Matter devices are designed for low power
- Most contact sensors last 1-2 years on a battery
- You'll see a low battery warning in device properties

### Range
- Matter uses Thread or WiFi
- Typical range: 30-50 feet indoors
- Walls and metal can reduce range
- If disconnected, move sensor closer or add Matter border router

### Reliability
- Matter sensors report changes immediately (< 1 second)
- If you miss events, check:
  - "Output on state change" is enabled
  - Green "connected" status on node
  - Node-RED logs for errors

### False Triggers
- If sensor triggers randomly:
  - Check battery level
  - Ensure proper mounting (gap between magnet and sensor)
  - Check for interference from other devices

## Troubleshooting Your Specific Sensor

### Sensor Not Commissioning
1. **Reset the sensor** (usually hold button 10+ seconds)
2. **Try again** with fresh pairing code
3. **Check compatibility** - ensure it's a Matter-certified device
4. **Distance** - bring sensor very close during commissioning

### No State Updates
1. **Check status** - should be green "connected" or blue showing state
2. **Test trigger** - manually separate magnet from sensor
3. **Check subscription** - look in Node-RED logs for "Subscribed to device"
4. **Manual read** - inject a message to trigger immediate read

### Device Disconnects
1. **Battery** - replace battery if low
2. **Range** - move closer or add border router
3. **Network** - check Thread network or WiFi stability
4. **Restart** - restart Node-RED to reconnect

## Advanced: Multiple Door Sensors

To add more sensors:

1. Commission each sensor separately in the controller config
2. Create a new "matter device" node for each sensor
3. Use the same controller for all
4. Give each node a descriptive name (Front Door, Back Door, etc.)
5. Each will output on its own wire

## Your Workflow Checklist

- [ ] Install plugin in Node-RED
- [ ] Restart Node-RED
- [ ] Put door sensor in pairing mode
- [ ] Find pairing code
- [ ] Create Matter Controller config
- [ ] Commission sensor (wait for success)
- [ ] Create matter device node
- [ ] Select controller and device
- [ ] Add debug node
- [ ] Deploy
- [ ] Test open/close
- [ ] Build your automation!

## Questions?

Check these files for more info:
- `QUICKSTART.md` - Fast 5-minute setup
- `SETUP.md` - Detailed setup guide
- `README.md` - Complete documentation
- `examples/contact-sensor-flow.json` - Working example flow

Happy automating your door sensor! 🚪✨

