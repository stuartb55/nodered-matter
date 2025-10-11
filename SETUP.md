# Setup Guide for node-red-contrib-matter

This guide will walk you through setting up your Matter devices with Node-RED.

## Quick Start

### 1. Install the Plugin

```bash
cd ~/.node-red
npm install node-red-contrib-matter
```

Restart Node-RED after installation.

### 2. Add the Matter Controller

1. Open Node-RED in your browser
2. Drag a "matter device" node from the palette into your flow
3. Double-click the node to open its configuration
4. Click the pencil icon next to "Controller" to create a new Matter Controller
5. Give your controller a name (e.g., "My Matter Controller")
6. Keep the configuration dialog open for the next step

### 3. Commission Your First Device

With the Matter Controller configuration dialog still open:

1. **Prepare your device:**
   - Put your Matter device in pairing mode (refer to your device's manual)
   - Locate the Matter pairing code (usually on a sticker or in the manual)
   - The code is typically 11 digits, like: `34970112332`

2. **Commission in Node-RED:**
   - In the "Commission New Device" section:
     - Enter the pairing code in the "Pairing Code" field
     - Enter a friendly name like "Front Door Sensor" (optional)
   - Click "Commission Device"
   - Wait 30-60 seconds for the process to complete
   - You should see a success message with the device's Node ID

3. **Verify:**
   - Scroll down to "Commissioned Devices"
   - Your device should appear with a green "Connected" status
   - Click "Add" or "Done" to save the controller configuration

### 4. Configure the Matter Device Node

1. Back in the matter device node configuration:
   - Select your controller from the "Controller" dropdown
   - Select your newly commissioned device from the "Device" dropdown
   - Choose "Contact Sensor" as the type
   - Keep "Output on state change" checked (recommended)
   - Give the node a friendly name
   - Click "Done"

2. Add a Debug node and connect it to the output of your Matter device node

3. Deploy your flow

### 5. Test It!

- Open the Node-RED debug panel
- Trigger your contact sensor (open/close a door, etc.)
- You should see messages appear in the debug panel showing the state changes

## Example Message

When your contact sensor changes state, you'll see messages like this:

```json
{
  "payload": "closed",
  "state": false,
  "topic": "matter/12345",
  "device": {
    "nodeId": "12345",
    "type": "contact"
  },
  "timestamp": "2025-10-11T12:34:56.789Z"
}
```

## Common Setup Issues

### "Controller not initialized"
- Wait a few seconds after deploying - the controller needs time to start
- Check Node-RED logs for error messages
- Ensure Node.js version is 18 or higher

### "Device not found" during commissioning
- Verify the device is in pairing mode
- Double-check the pairing code
- Ensure the device is close to your Node-RED server
- Make sure the device hasn't been commissioned to another Matter controller

### "No state updates"
- Check that the device shows as "Connected" in the controller
- Verify "Output on state change" is enabled
- Try manually triggering a read by sending any message to the node's input
- Check Node-RED debug logs for errors

### Device won't reconnect after restart
- Device commissioning data is stored in `~/.node-red/.node-red-matter/`
- If this directory is deleted, you'll need to re-commission devices
- Ensure proper file permissions on this directory

## Finding Your Device's Pairing Code

Different manufacturers place the pairing code in different locations:

### QR Code
- Usually on the device or packaging
- Use your phone to scan and reveal the numeric code
- The code is embedded in the QR code data

### Manual Code
- Look for a sticker on the device
- Check the user manual
- Format: usually 11 digits like `12345678901`
- May also be formatted as `XXXXX-XXXXX-XXXX`

### Common Locations
- On the back or bottom of the device
- Inside the battery compartment
- On the original packaging
- In the device's mobile app (during setup)

## Advanced Configuration

### Polling Mode

If real-time updates aren't working, you can use polling mode:

1. In the matter device node configuration:
   - Uncheck "Output on state change"
   - Set "Poll Interval" to your desired seconds (e.g., 5 for every 5 seconds)
   - Deploy

Note: Polling uses more resources than subscriptions.

### Manual State Reading

You can trigger a manual state read at any time:

1. Connect an Inject node to the matter device node's input
2. Click the Inject node's button
3. The device will immediately read and output the current state

### Multiple Controllers

You can create multiple Matter Controller configurations if needed:
- Each controller operates independently
- Useful for managing devices in different networks
- Each controller stores its data separately

## Storage and Backup

### Important Files

The plugin stores data in:
```
~/.node-red/.node-red-matter/
```

This directory contains:
- Device commissioning credentials
- Network pairing information
- Controller state

### Backup Recommendation

**Back up the `.node-red-matter` directory** to preserve your device pairings. Without this, you'll need to re-commission all devices if you:
- Reinstall Node-RED
- Move to a new system
- Restore from backup

```bash
# Backup
cp -r ~/.node-red/.node-red-matter ~/matter-backup

# Restore
cp -r ~/matter-backup ~/.node-red/.node-red-matter
```

## Next Steps

- Check out the example flow in `examples/contact-sensor-flow.json`
- Import it into Node-RED: Import → Examples → node-red-contrib-matter
- Read the full documentation in `README.md`
- Experiment with different node configurations

## Getting Help

If you run into issues:
1. Check the Node-RED logs (terminal where Node-RED is running)
2. Enable debug mode in the matter device nodes
3. Review this setup guide and the main README
4. Open an issue on GitHub with:
   - Node-RED version
   - Node.js version
   - Error messages from logs
   - Steps to reproduce the issue

## Security Notes

- Matter uses end-to-end encryption
- All communication is secure by design
- No cloud connection required
- Credentials stored locally only
- Network traffic never leaves your local network

Enjoy your Matter-enabled Node-RED flows!

