# node-red-contrib-matter

Node-RED nodes for integrating Matter smart home devices into your flows.

## Overview

This package provides Node-RED integration for Matter devices, allowing you to:
- Commission Matter devices using pairing codes
- Monitor device states (contact sensors, switches, etc.)
- React to device state changes in real-time
- Control Matter-enabled smart home devices

## What is Matter?

Matter is an open-source connectivity standard for smart home devices. It enables devices from different manufacturers to work together seamlessly and securely.

## Installation

### Prerequisites

- Node.js 18.0 or higher
- Node-RED 2.0 or higher

### Install from npm (when published)

```bash
cd ~/.node-red
npm install node-red-contrib-matter
```

### Install from source

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-matter
```

After installation, restart Node-RED.

## Nodes

### Matter Controller (Configuration Node)

The Matter Controller is a configuration node that manages the Matter controller and handles device commissioning.

**Features:**
- Commission new Matter devices using pairing codes
- Automatically reconnect to previously commissioned devices
- Manage multiple devices from a single controller

**Usage:**
1. Create a new Matter Controller configuration node
2. Enter the Matter pairing code from your device (found on the device, in its manual, or via QR code)
3. Optionally provide a friendly name for the device
4. Click "Commission Device" to add it to your network

### Matter Device (Input Node)

The Matter Device node monitors a commissioned device and outputs its state.

**Configuration:**
- **Controller**: Select the Matter Controller configuration
- **Device**: Choose from commissioned devices
- **Type**: Device type (Contact Sensor, Boolean State, etc.)
- **Output on state change**: Subscribe to device events (recommended)
- **Poll Interval**: Alternative polling method (seconds, 0 = disabled)

**Inputs:**
- Any message triggers an immediate device state read

**Outputs:**
```javascript
{
  payload: "closed",        // For contact sensors: "open" or "closed"
  state: false,             // Raw boolean state
  topic: "matter/12345",    // Topic with device nodeId
  device: {
    nodeId: "12345",
    type: "contact"
  },
  timestamp: "2025-10-11T12:34:56.789Z"
}
```

## Example Flow

Here's a simple example that monitors a door contact sensor and sends a notification when it opens:

```json
[
  {
    "id": "matter-device-1",
    "type": "matter-device",
    "name": "Front Door Sensor",
    "controller": "matter-controller-1",
    "device": "12345",
    "deviceType": "contact",
    "outputOnChange": true,
    "x": 200,
    "y": 200,
    "wires": [["check-state"]]
  },
  {
    "id": "check-state",
    "type": "switch",
    "name": "Check if Open",
    "property": "payload",
    "rules": [
      { "t": "eq", "v": "open", "vt": "str" }
    ],
    "x": 400,
    "y": 200,
    "wires": [["notify"]]
  },
  {
    "id": "notify",
    "type": "debug",
    "name": "Door Opened",
    "x": 600,
    "y": 200,
    "wires": []
  }
]
```

## Commissioning a Device

1. Put your Matter device in pairing mode (refer to device documentation)
2. Open the Matter Controller configuration in Node-RED
3. Enter the pairing code:
   - From the device's QR code
   - From the device label
   - From the device manual (usually an 11-digit code)
4. Optionally enter a friendly name
5. Click "Commission Device"
6. Wait for the commissioning process to complete (may take 30-60 seconds)

**Pairing Code Formats:**
- QR code: Scan and enter the numeric code
- Manual code: 11-digit code like `34970112332`
- Format: `XXXXX-XXXXX-XXXX` or similar

## Troubleshooting

### Device won't commission
- Ensure the device is in pairing mode
- Verify the pairing code is correct
- Check that the device is within range
- Make sure no other Matter controller has claimed the device
- Try factory resetting the device

### Device shows as disconnected
- Check network connectivity
- Verify the device has power
- Ensure the Matter controller is running
- Restart Node-RED

### No state updates
- Verify "Output on state change" is enabled, or set a poll interval
- Check that the device is connected (green status)
- Try sending an input message to trigger a manual read
- Check the Node-RED logs for errors

## Supported Devices

Currently tested with:
- Contact/door sensors
- Boolean state devices

Planned support:
- Light bulbs and dimmers
- Smart plugs and switches
- Temperature sensors
- Motion sensors
- Locks

## Storage

Device commissioning data is stored in:
```
~/.node-red/.node-red-matter/
```

This directory contains:
- Device credentials
- Network configuration
- Controller state

**Important**: Back up this directory to preserve your device pairings.

## Security

- All Matter communication is encrypted end-to-end
- Device credentials are stored locally
- No cloud connection required
- Follows Matter security specifications

## Development

### Building from Source

```bash
git clone <repository-url>
cd node-red-contrib-matter
npm install
```

### Testing

Link the package to your Node-RED instance:
```bash
cd ~/.node-red
npm link /path/to/node-red-contrib-matter
```

Restart Node-RED and the nodes will appear in the palette.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Credits

Built with:
- [@project-chip/matter-node.js](https://github.com/project-chip/matter.js) - Matter protocol implementation
- [Node-RED](https://nodered.org/) - Flow-based programming platform

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the Matter specification documentation

## Changelog

### 0.1.0 (Initial Release)
- Matter controller configuration node
- Matter device input node
- Contact sensor support
- Device commissioning via pairing codes
- Real-time state updates via subscriptions
- Optional polling mode

