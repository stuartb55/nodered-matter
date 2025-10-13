# Node-RED Matter Plugin

A robust, well-architected Node-RED plugin for Matter device integration with comprehensive support for both WiFi and Thread devices, including Aqara door sensors and other smart home devices.

## Features

- **Complete Matter Support**: Initial and multi-admin commissioning
- **Thread & WiFi Devices**: Automatic network type detection and appropriate handling
- **Aqara Integration**: Optimized for Aqara Thread devices with proper timeout handling
- **Cluster Adapters**: Extensible framework supporting BooleanState, OnOff, LevelControl, and more
- **Robust Error Handling**: Detailed error messages with actionable troubleshooting steps
- **Comprehensive Testing**: 80%+ test coverage with unit and integration tests
- **Service Layer Architecture**: Clean separation of concerns for maintainability

## Quick Start

### Installation

```bash
# Install via npm (from GitHub)
npm install git+https://github.com/your-username/node-red-contrib-matter.git

# Or install locally
npm install /path/to/node-red-contrib-matter
```

### Basic Usage

1. **Add Matter Controller Node**
   - Drag `matter-controller` node onto your flow
   - Configure with a name (e.g., "My Matter Controller")
   - Deploy the flow

2. **Commission Your Device**
   - Double-click the controller node
   - Enter your device's pairing code (11-digit number or QR code)
   - Click "Commission Device"
   - Wait for commissioning to complete (30-120 seconds)

3. **Add Matter Device Node**
   - Drag `matter-device` node onto your flow
   - Select your controller and commissioned device
   - Choose device type (auto-detected) or select manually
   - Deploy and connect to debug node

## Supported Devices

### Contact Sensors (BooleanState)
- Aqara Door/Window Sensors
- Other Matter-compatible contact sensors
- Output: `"open"` or `"closed"`

### Switches (OnOff)
- Smart switches and outlets
- Lights and other on/off devices
- Output: `"on"` or `"off"`

### Dimmers (LevelControl)
- Dimmer switches
- Volume controls
- Output: `0-100` (percentage)

## Architecture

The plugin uses a layered architecture for better maintainability and extensibility:

```
lib/
├── matter-service.js           # Core Matter server management
├── commissioning-service.js    # Device commissioning logic
├── device-manager.js          # Device registry and state management
├── errors/                     # Custom error classes
└── clusters/                   # Cluster adapters
    ├── base-adapter.js
    ├── boolean-state-adapter.js
    ├── on-off-adapter.js
    └── level-control-adapter.js
```

## Commissioning

### Initial Commissioning
For new devices or factory-reset devices:

1. Put device in pairing mode (usually hold button 5+ seconds)
2. Enter the original pairing code from device label/manual
3. Click "Commission Device"
4. Wait for completion

### Multi-Admin Commissioning
For devices already paired with other controllers (Aqara, Alexa, etc.):

1. Generate sharing code from primary controller app
2. Check "Multi-Admin" option in Node-RED
3. Enter the sharing code (not original pairing code)
4. Click "Commission Device"

## Thread Device Support

### Aqara Thread Devices
The plugin automatically detects Aqara devices (vendor ID 4447) and:

- Uses extended timeouts (120 seconds vs 60 for WiFi)
- Provides Thread-specific error messages
- Handles commissioning window management
- Detects Thread environment for guidance

### Thread Border Router Requirements
For Thread devices to work properly:

- Aqara M100 hub must be operational
- Thread network must be active
- Device must be in range of Thread Border Router
- Consider temporarily powering off M100 during commissioning if issues persist

## API Reference

### Matter Controller Node

#### Configuration
- **Name**: Controller identifier
- **Storage Directory**: Where Matter data is stored (default: `.node-red-matter`)

#### Methods
- `commissionDevice(pairingCode, deviceName, options)` - Commission a new device
- `getDevice(nodeId)` - Get device information
- `getDevices()` - Get all commissioned devices
- `healthCheck()` - Perform health check
- `isThreadEnvironment()` - Check if Thread devices are present

#### HTTP Endpoints
- `POST /matter-controller/:id/commission` - Commission device via API
- `GET /matter-controller/:id/devices` - List devices
- `GET /matter-controller/:id/health` - Health check

### Matter Device Node

#### Configuration
- **Controller**: Select Matter controller
- **Device**: Choose commissioned device
- **Device Type**: Auto-detect or manual selection
- **Output on Change**: Subscribe to state changes
- **Poll Interval**: Polling frequency (0 = no polling)

#### Input Messages
- Any message triggers immediate state read
- Command objects for device control:
  ```javascript
  { action: "turnOn" }      // For switches
  { action: "setLevel", level: 50 }  // For dimmers
  ```

#### Output Messages
```javascript
{
  payload: "closed",        // Human-readable state
  state: false,             // Boolean/raw state
  topic: "matter/12345",    // Device topic
  device: {
    nodeId: "12345",
    type: "contact",
    cluster: "BooleanState"
  },
  timestamp: "2025-01-01T12:00:00.000Z"
}
```

## Testing

The plugin includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Structure
- **Unit Tests**: Test individual service components
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test complete workflows

## Troubleshooting

### Common Issues

#### Commissioning Failures

**"Device discovery failed"**
- Ensure device is in pairing mode
- Check device is on same network
- Verify pairing code is correct
- For Thread devices: ensure M100 hub is operational

**"Key confirmation failed"**
- For initial commissioning: factory reset device
- For multi-admin: use fresh sharing code from primary app
- Check device fabric limit (some devices limit to 2-3 controllers)
- For Thread devices: try temporarily powering off M100 hub

**"Commissioning timed out"**
- Thread devices need longer timeouts (up to 2 minutes)
- Check network connectivity
- Ensure device is powered on
- Verify device is in commissioning window

#### Device State Issues

**Device not responding**
- Check device is powered on
- Verify network connectivity
- Try re-commissioning device
- Check device logs for errors

**State changes not detected**
- Ensure "Output on Change" is enabled
- Check subscription is active
- Verify device supports the cluster type
- Try polling mode as fallback

### Debug Mode

Enable debug logging in Node-RED settings:
1. Go to Node-RED settings
2. Enable "Debug" logging
3. Check console for detailed logs

### Health Check

Use the health check endpoint to diagnose issues:
```bash
curl http://localhost:1880/matter-controller/[node-id]/health
```

## Development

### Project Structure
```
node-red-contrib-matter/
├── lib/                     # Service layer
├── nodes/                   # Node-RED nodes
├── test/                    # Test suite
├── package.json
└── README.md
```

### Adding New Cluster Types

1. Create new adapter in `lib/clusters/`
2. Extend `BaseClusterAdapter`
3. Implement required methods
4. Add to `ClusterAdapterFactory`
5. Write tests

### Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: GitHub Issues
- **Documentation**: This README and inline code comments
- **Testing**: Comprehensive test suite with examples

## Changelog

### v1.0.0
- Complete rewrite with service layer architecture
- Fixed commissioning issues for Aqara Thread devices
- Added comprehensive error handling
- Implemented cluster adapter framework
- Added extensive test coverage
- Improved Thread device support
- Enhanced multi-admin commissioning