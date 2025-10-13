# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Node-RED Matter plugin.

## Commissioning Issues

### Device Discovery Failed

**Symptoms:**
- Error: "Device discovery failed - device not found during scan"
- Commissioning times out during discovery phase
- Device not appearing in scan results

**Solutions:**

1. **Check Device Pairing Mode**
   - Hold device button for 5+ seconds until LED flashes
   - Some devices require 10+ seconds for factory reset
   - Verify device is in commissioning window (usually 3-15 minutes)

2. **Network Connectivity**
   - Ensure device and Node-RED are on same network
   - Check firewall settings (Matter uses ports 5540 UDP)
   - Verify mDNS is working: `ping device-name.local`

3. **Thread Device Specific**
   - Ensure Aqara M100 hub is operational
   - Check Thread network is active in Aqara app
   - Device must be in range of Thread Border Router
   - Try temporarily powering off M100 hub during commissioning

4. **Pairing Code Issues**
   - Use original pairing code from device label/manual
   - For multi-admin: use sharing code from primary app
   - Verify code format (11 digits for manual, MT: prefix for QR)

### Key Confirmation Failed

**Symptoms:**
- Error: "Key confirmation failed" or "PASE protocol error"
- Device found but commissioning fails during key exchange
- Works in other apps (Alexa, Google) but not Node-RED

**Solutions:**

1. **Initial Commissioning Issues**
   - Factory reset device (hold button 10+ seconds)
   - Ensure device has no existing fabrics
   - Use original pairing code, not sharing code

2. **Multi-Admin Issues**
   - Generate fresh sharing code from primary controller
   - Use sharing code immediately (they expire quickly)
   - Ensure device is in commissioning window from primary app
   - Check device fabric limit (some devices limit to 2-3 controllers)

3. **Thread Device Specific**
   - Aqara devices may have vendor lock-in
   - Try temporarily powering off Aqara M100 hub
   - Check Aqara app for "Allow other controllers" setting
   - Device may need complete Thread network removal

4. **Network Issues**
   - Check for network interference
   - Ensure stable network connection
   - Try commissioning from different location
   - Verify no VPN or proxy interference

### Commissioning Timeout

**Symptoms:**
- Commissioning process hangs or times out
- "Commissioning timed out" error after 60-120 seconds
- Device appears to be responding but process doesn't complete

**Solutions:**

1. **Timeout Configuration**
   - Thread devices need 120 seconds (automatic)
   - WiFi devices use 60 seconds
   - Check if timeout is appropriate for your device

2. **Network Performance**
   - Check network latency and stability
   - Ensure sufficient bandwidth
   - Avoid network congestion during commissioning

3. **Device Issues**
   - Verify device is powered on and stable
   - Check device battery level
   - Ensure device is not in sleep mode
   - Try commissioning during low network usage

4. **Thread Specific**
   - Thread devices may need longer discovery time
   - Ensure Thread Border Router is stable
   - Check Thread network mesh quality

## Device State Issues

### Device Not Responding

**Symptoms:**
- Device shows as offline or disconnected
- State reads fail with errors
- No response to commands

**Solutions:**

1. **Connection Issues**
   - Check device power and battery
   - Verify network connectivity
   - Ensure device is in range
   - Try re-commissioning device

2. **Thread Device Issues**
   - Check Aqara M100 hub status
   - Verify Thread network connectivity
   - Ensure device is connected to Thread mesh
   - Check Thread Border Router logs

3. **Network Issues**
   - Check firewall settings
   - Verify mDNS resolution
   - Test network connectivity to device
   - Check for IP address conflicts

### State Changes Not Detected

**Symptoms:**
- Device state doesn't update automatically
- Manual reads work but subscriptions don't
- Missing state change notifications

**Solutions:**

1. **Subscription Issues**
   - Ensure "Output on Change" is enabled
   - Check subscription is active
   - Verify device supports the cluster type
   - Try polling mode as fallback

2. **Cluster Support**
   - Verify device supports required cluster
   - Check cluster adapter compatibility
   - Ensure correct device type is selected
   - Try different cluster types

3. **Network Issues**
   - Check for network interruptions
   - Verify stable connection to device
   - Ensure no firewall blocking
   - Test with different polling intervals

## Multi-Admin Issues

### Adding Additional Controller

**Symptoms:**
- Can't add Node-RED as additional controller
- Sharing code doesn't work
- Device rejects additional fabric

**Solutions:**

1. **Sharing Code Issues**
   - Generate fresh sharing code from primary app
   - Use sharing code immediately (expires quickly)
   - Ensure correct sharing code type
   - Check primary controller supports sharing

2. **Device Limitations**
   - Check device fabric limit (usually 16, some limit to 2-3)
   - Remove unused fabrics from other controllers
   - Ensure device supports multi-admin
   - Try factory reset and re-commission

3. **Primary Controller Issues**
   - Ensure primary controller is working
   - Check primary controller supports sharing
   - Verify device is properly commissioned to primary
   - Try different primary controller

### Fabric Management

**Symptoms:**
- Device shows multiple fabrics
- Confusion about which controller is primary
- Device behavior inconsistent

**Solutions:**

1. **Fabric Cleanup**
   - Remove unused fabrics from device
   - Identify primary vs secondary controllers
   - Clean up orphaned fabrics
   - Consider factory reset for clean slate

2. **Controller Coordination**
   - Ensure controllers don't conflict
   - Use different controller names
   - Avoid simultaneous operations
   - Check for controller conflicts

## Thread-Specific Issues

### Thread Network Problems

**Symptoms:**
- Thread devices not connecting
- Intermittent connectivity issues
   - Thread mesh instability

**Solutions:**

1. **Thread Border Router**
   - Ensure Aqara M100 hub is operational
   - Check Thread network status in Aqara app
   - Verify Thread Border Router is stable
   - Consider additional Thread Border Routers

2. **Thread Mesh**
   - Check Thread mesh quality
   - Ensure devices are in range
   - Verify Thread network topology
   - Check for Thread interference

3. **Thread Credentials**
   - Verify Thread network credentials
   - Check Thread network key
   - Ensure proper Thread network setup
   - Consider Thread network reset

### Aqara-Specific Issues

**Symptoms:**
- Aqara devices not commissioning
- Vendor lock-in behavior
- Thread network conflicts

**Solutions:**

1. **Vendor Lock-in**
   - Aqara devices may prefer Aqara ecosystem
   - Try temporarily disabling Aqara M100 hub
   - Check Aqara app settings
   - Consider factory reset approach

2. **Aqara App Settings**
   - Check "Allow other controllers" setting
   - Verify sharing permissions
   - Ensure proper Aqara app configuration
   - Check Aqara app updates

## Debugging

### Enable Debug Logging

1. **Node-RED Settings**
   - Go to Node-RED settings
   - Enable "Debug" logging level
   - Check console for detailed logs

2. **Matter Service Logs**
   - Check Matter service initialization
   - Verify commissioning process steps
   - Look for network-related errors

3. **Device Manager Logs**
   - Check device registration
   - Verify state reading attempts
   - Look for subscription errors

### Health Check

Use the health check endpoint:
```bash
curl http://localhost:1880/matter-controller/[node-id]/health
```

Response includes:
- Service status
- Device statistics
- Network information
- Thread environment detection

### Network Diagnostics

1. **mDNS Resolution**
   ```bash
   # Test mDNS resolution
   ping device-name.local
   
   # List mDNS services
   dns-sd -B _matter._tcp
   ```

2. **Network Connectivity**
   ```bash
   # Test network connectivity
   ping [device-ip]
   
   # Check UDP port 5540
   nc -u [device-ip] 5540
   ```

3. **Thread Network**
   - Check Aqara app for Thread network status
   - Verify Thread Border Router connectivity
   - Check Thread mesh quality

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `COMMISSIONING_FAILED` | General commissioning failure | Check device pairing mode and network |
| `DEVICE_NOT_FOUND` | Device not discovered | Verify device is in pairing mode |
| `KEY_CONFIRMATION_FAILED` | PASE protocol failure | Check pairing code and device state |
| `TIMEOUT` | Commissioning timeout | Increase timeout or check network |
| `VALIDATION_ERROR` | Invalid input data | Check pairing code format |
| `NETWORK_ERROR` | Network connectivity issue | Check network and firewall |

## Getting Help

### Before Asking for Help

1. **Check Logs**
   - Enable debug logging
   - Look for error messages
   - Check network connectivity

2. **Test Basic Functionality**
   - Try commissioning a simple device
   - Test with different pairing codes
   - Verify network connectivity

3. **Gather Information**
   - Device type and model
   - Pairing code format
   - Error messages
   - Network configuration

### Support Channels

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check README and inline comments
- **Test Suite**: Look at test examples for usage patterns

### Providing Information

When reporting issues, include:
- Device type and model
- Pairing code format (without actual code)
- Error messages and logs
- Network configuration
- Steps to reproduce
- Expected vs actual behavior