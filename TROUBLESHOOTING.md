# Troubleshooting Guide

Common issues and solutions for node-red-contrib-matter.

## Installation Issues

### Plugin doesn't appear in Node-RED palette

**Symptoms**: After installation, "Matter" category or nodes don't show up.

**Solutions**:
1. Restart Node-RED completely
2. Check installation:
   ```bash
   cd ~/.node-red
   npm list | grep matter
   ```
3. Check Node-RED logs for errors
4. Ensure Node.js version is 18+: `node --version`
5. Reinstall dependencies:
   ```bash
   cd ~/.node-red/node_modules/node-red-contrib-matter
   npm install
   ```

### Docker: Plugin doesn't appear

**Solutions**:
1. Verify installation in container:
   ```bash
   docker exec nodered npm list | grep matter
   ```
2. Check container logs:
   ```bash
   docker logs nodered
   ```
3. Ensure `/data` volume is persistent
4. Reinstall inside container:
   ```bash
   docker exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"
   docker restart nodered
   ```

## Configuration Issues

### ❌ "Controller node not found"

**Symptoms**: When trying to commission a device, you see "✗ Controller node not found"

**Cause**: The Matter Controller configuration hasn't been saved/deployed yet.

**Solution**:
1. In the Matter Controller config dialog, click **"Add"** (not Cancel)
2. If prompted, click **"Deploy"** in Node-RED
3. **Reopen** the controller configuration (double-click the node or edit via config nodes)
4. Now you can commission devices

**Important**: You MUST save the controller first before commissioning devices!

### Controller shows "no controller" status

**Symptoms**: Matter device node shows red status "no controller"

**Solutions**:
1. Ensure you've created a Matter Controller configuration
2. In the matter device node, select the controller from dropdown
3. Deploy the flow
4. Wait 10-15 seconds for controller to initialize

## Commissioning Issues

### Device won't commission

**Symptoms**: Commissioning fails or times out

**Solutions**:

1. **Verify device is in pairing mode**:
   - Usually requires holding a button for 3-5 seconds
   - LED should blink indicating pairing mode
   - Check device manual for specific instructions

2. **Check pairing code**:
   - Verify you entered the code correctly
   - Code is usually 11 digits
   - Try scanning QR code with phone to verify code

3. **Factory reset the device**:
   - Device may have been commissioned to another controller
   - Factory reset usually requires holding button 10+ seconds
   - Try commissioning again with fresh reset

4. **Network issues**:
   - Ensure device is close to Node-RED server during commissioning
   - For Thread devices, ensure you have a Thread border router
   - For WiFi devices, ensure same network as Node-RED

5. **Docker specific - Enable host networking**:
   ```yaml
   # In docker-compose.yml
   services:
     nodered:
       network_mode: host
   ```
   Then:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

6. **Check Node-RED logs**:
   - Look for specific error messages
   - May indicate network, permissions, or protocol issues

### "Device not found" error

**Solutions**:
1. Device is not in pairing mode
2. Pairing code is incorrect
3. Device is out of range
4. Device already commissioned to another Matter controller
5. Network firewall blocking Matter ports (UDP 5540, 5353)

### Commissioning takes forever

**Normal behavior**: Commissioning can take 30-60 seconds.

**If longer than 2 minutes**:
1. Cancel and try again
2. Move device closer to Node-RED server
3. Check network connectivity
4. Factory reset device and retry

## Device State Issues

### No state updates from device

**Symptoms**: Device shows as connected but no messages output

**Solutions**:

1. **Check output on change is enabled**:
   - Edit matter device node
   - Ensure "Output on state change" is checked
   - Deploy

2. **Try manual trigger**:
   - Add an inject node
   - Connect to matter device input
   - Click inject to trigger read
   - If this works, subscription may have failed

3. **Enable polling as backup**:
   - Edit matter device node
   - Uncheck "Output on state change"
   - Set "Poll Interval" to 5 seconds
   - Deploy
   - Should now get updates every 5 seconds

4. **Check device is actually connected**:
   - Node status should show green "ready" or state
   - If red/yellow, device may be disconnected

5. **Trigger the sensor**:
   - Physically trigger the device (open/close door, etc.)
   - Ensure sensor batteries are good
   - Check sensor is properly installed (magnet aligned)

### Device shows as disconnected

**Symptoms**: Red status, "device not found" errors

**Solutions**:

1. **Check device power**:
   - Replace batteries if low
   - Ensure powered devices are plugged in

2. **Check range**:
   - Move device closer to Node-RED server
   - Add Thread border router if needed
   - Check WiFi signal strength

3. **Restart Node-RED**:
   - Sometimes reconnection fails
   - Restart helps re-establish connection

4. **Re-commission device**:
   - If device keeps disconnecting
   - Factory reset and commission again

## Docker-Specific Issues

### Can't commission devices in Docker

**Most common cause**: Network isolation

**Solutions**:

1. **Use host networking** (recommended):
   ```yaml
   # docker-compose.yml
   services:
     nodered:
       network_mode: host
   ```

2. **Check container can reach devices**:
   ```bash
   docker exec nodered ping [device-ip]
   ```

3. **Verify ports are accessible**:
   - Matter uses UDP 5540, 5353
   - Ensure these aren't blocked

### Device data lost after container restart

**Cause**: Non-persistent volume

**Solution**: Ensure `/data` is a persistent volume:
```yaml
volumes:
  - nodered-data:/data  # Named volume (persistent)
```

**NOT**:
```yaml
volumes:
  - /tmp/nodered:/data  # Bad: /tmp may be cleared
```

### Permission errors in Docker

**Symptoms**: "EACCES" or "permission denied" errors

**Solutions**:
```bash
# Fix permissions
docker exec nodered chown -R node-red:node-red /data/node-red-contrib-matter
docker exec nodered chown -R node-red:node-red /data/.node-red-matter
docker restart nodered
```

## Runtime Errors

### "Module not found" errors

**Solutions**:
1. Check dependencies are installed:
   ```bash
   cd ~/.node-red/node_modules/node-red-contrib-matter
   npm install
   ```
2. For Docker:
   ```bash
   docker exec nodered sh -c "cd /data/node-red-contrib-matter && npm install"
   docker restart nodered
   ```

### "Matter Controller not initialized"

**Symptoms**: Yellow status "initializing" that never changes

**Solutions**:
1. Wait 30 seconds - initialization takes time
2. Check Node-RED logs for errors
3. Verify storage directory is writable:
   ```bash
   # On host
   ls -la ~/.node-red/.node-red-matter/
   
   # In Docker
   docker exec nodered ls -la /data/.node-red-matter/
   ```
4. If directory doesn't exist, create it:
   ```bash
   mkdir -p ~/.node-red/.node-red-matter
   ```
5. Restart Node-RED

### Storage/permission errors

**Symptoms**: Errors about writing to `.node-red-matter` directory

**Solutions**:
1. Ensure directory exists and is writable
2. Check permissions:
   ```bash
   ls -la ~/.node-red/.node-red-matter/
   ```
3. Fix permissions if needed:
   ```bash
   chmod 755 ~/.node-red/.node-red-matter
   ```

## Matter Protocol Issues

### "Device type not supported"

**Currently supported**:
- Contact sensors (doors/windows)
- Boolean state devices

**Planned support**:
- Lights, switches, plugs, sensors, locks

**Workaround**: Use the device as a Boolean State type and handle conversion in Node-RED flow.

### "Cluster not found"

**Cause**: Device doesn't support expected cluster type

**Solutions**:
1. Try "Boolean State" device type instead of "Contact Sensor"
2. Check device actually supports Matter (not just Thread)
3. Verify device is Matter-certified

## General Debugging

### Enable verbose logging

Add to Node-RED settings.js:
```javascript
logging: {
    console: {
        level: "debug",
        metrics: false,
        audit: false
    }
}
```

### Check Node-RED logs

**Standard installation**:
```bash
# Logs appear in terminal where Node-RED is running
# Or check PM2/systemd logs if running as service
```

**Docker**:
```bash
docker logs nodered
docker logs -f nodered  # Follow mode
```

### Collect diagnostic info

When reporting issues, include:
1. Node-RED version: `node-red --version`
2. Node.js version: `node --version`
3. Plugin version: Check package.json
4. Installation method (npm, Docker, etc.)
5. Error messages from logs
6. Device type and manufacturer
7. Steps to reproduce

### Test with example flow

1. Import `examples/contact-sensor-flow.json`
2. Configure with your device
3. Deploy and test
4. If example works, issue is in your custom flow

## Still Having Issues?

1. Check [GitHub Issues](https://github.com/stuartb55/nodered-matter/issues)
2. Search for similar problems
3. Open a new issue with:
   - Clear description of problem
   - Steps to reproduce
   - Error messages/logs
   - System information
   - What you've tried

## Quick Checklist

Before asking for help, verify:

- [ ] Node.js version is 18 or higher
- [ ] Plugin appears in Node-RED palette
- [ ] Matter Controller is saved/deployed
- [ ] Device is in pairing mode
- [ ] Pairing code is correct
- [ ] Network connectivity is good
- [ ] For Docker: host networking is enabled
- [ ] Logs checked for specific errors
- [ ] Example flow tested

## Useful Commands

```bash
# Check installation
npm list node-red-contrib-matter

# Reinstall dependencies
cd ~/.node-red/node_modules/node-red-contrib-matter && npm install

# View storage
ls -la ~/.node-red/.node-red-matter/

# Docker: check installation
docker exec nodered npm list | grep matter

# Docker: view logs
docker logs -f nodered

# Docker: access shell
docker exec -it nodered /bin/bash

# Test Node-RED connection
curl http://localhost:1880
```

## Common Workflow Issues

### Accidentally clicked "Cancel" instead of "Add"

**Result**: Controller not saved, commissioning fails

**Solution**: Reopen dialog, click "Add"

### Forgot to deploy after adding controller

**Result**: Controller not active

**Solution**: Click "Deploy" button (top right in Node-RED)

### Commissioned device but it's not in dropdown

**Solution**: 
1. Check controller is deployed
2. Refresh the matter device node config
3. Device should appear in dropdown
4. If not, check controller's "Commissioned Devices" section

---

**Last Updated**: 2025-10-11  
**Plugin Version**: 0.1.0

