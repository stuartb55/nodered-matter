# Quick Start - node-red-contrib-matter

Get your Matter contact sensor working in Node-RED in 5 minutes!

## Prerequisites

- Node-RED installed and running
- Node.js 18 or higher
- A Matter-compatible device (contact sensor, etc.)
- Device pairing code

## Installation

```bash
cd ~/.node-red
npm install node-red-contrib-matter
# Restart Node-RED
```

## Step-by-Step Setup

### 1. Open Node-RED
Navigate to your Node-RED editor (usually `http://localhost:1880`)

### 2. Add Nodes
- Find "matter device" in the palette (left sidebar)
- Drag it into your flow

### 3. Configure Controller
- Double-click the "matter device" node
- Click the pencil icon next to "Controller"
- Name it (e.g., "Home Matter")
- Leave the dialog open

### 4. Commission Your Device
Still in the controller dialog:

```
Put your device in pairing mode:
→ Enter the pairing code from the device
→ Click "Commission Device"
→ Wait ~30 seconds
→ Look for success message
```

### 5. Select Device
- Click "Done" on the controller dialog
- In the device node:
  - Select your controller
  - Select your device from the dropdown
  - Choose "Contact Sensor"
  - Check "Output on state change"
- Click "Done"

### 6. Add Debug Output
- Drag a "debug" node
- Connect matter device → debug
- Click "Deploy"

### 7. Test!
- Open debug panel (bug icon in sidebar)
- Trigger your sensor (open/close)
- See messages appear!

## What You'll See

```json
{
  "payload": "open",     // or "closed"
  "state": true,         // or false
  "topic": "matter/12345",
  "timestamp": "2025-10-11T12:34:56.789Z"
}
```

## Pairing Code Examples

Your pairing code looks like one of these:
- `34970112332` (11 digits)
- From a QR code on the device
- In the device manual

## Common Issues

**"Device not found"**
→ Make sure device is in pairing mode
→ Check the pairing code is correct

**"Not connected"**
→ Wait 10 seconds after deploying
→ Check Node-RED logs

**"No updates"**
→ Verify "Output on state change" is checked
→ Try sending any message to the input

## Example Flow

Import this into Node-RED:

1. Menu → Import → Clipboard
2. Paste the content from `examples/contact-sensor-flow.json`
3. Click Import
4. Configure with your device
5. Deploy

## Need More Help?

- Read `SETUP.md` for detailed setup
- Check `README.md` for full documentation
- Look at Node-RED logs for errors

## Next Steps

Once your sensor works:
- Add more logic (switch nodes, functions)
- Connect to notifications
- Trigger automations
- Add more Matter devices

Happy automating! 🏠✨

