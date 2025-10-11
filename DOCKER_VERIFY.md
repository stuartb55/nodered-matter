# Verify Docker Installation

## Quick Verification Steps

After installing the plugin in Docker, follow these steps to verify everything works:

### 1. Restart Node-RED Container

```bash
docker restart nodered
```

Wait 10-15 seconds for Node-RED to fully start.

### 2. Check Node-RED is Running

```bash
docker logs nodered
```

Look for:
```
[info] Server now running at http://...
[info] Started flows
```

### 3. Open Node-RED Web Interface

Open your browser to:
- http://localhost:1880 (if Docker is on local machine)
- http://[docker-host-ip]:1880 (if Docker is on another machine)

### 4. Verify Plugin Appears

In the Node-RED editor:
1. Look at the **left sidebar** (the palette)
2. Scroll down to find the **"Matter"** category
3. You should see: **"matter device"** node

### 5. Test Configuration Node Access

1. Drag the "matter device" node onto the canvas
2. Double-click it to open configuration
3. Look for the "Controller" field with a **pencil icon (✏️)**
4. Click the pencil - this should open the Matter Controller configuration

If all these work, your installation is successful! ✅

## About the npm Vulnerabilities

You may see vulnerability warnings during installation. **This is normal and safe to ignore** for local use.

### What the Warnings Mean

```
2 high severity vulnerabilities
7 vulnerabilities (3 low, 4 critical)
```

These vulnerabilities are **NOT in the Matter plugin**. They're in:
- Node-RED core packages
- Other unrelated plugins
- Node-RED web server dependencies

### Why It's Safe for Local Use

1. **Your setup**: Matter devices + local Node-RED
2. **Risk level**: Very low for home/local network use
3. **The vulnerabilities**: Mainly web server issues, not relevant to Matter protocol
4. **Our plugin**: Uses only Matter.js libraries (secure and up-to-date)

### What NOT To Do

❌ **DO NOT run: `npm audit fix --force`**

This can break Node-RED! The `--force` flag updates packages in breaking ways.

### If You're Concerned

If security is critical (e.g., production environment):
1. Use the latest Node-RED Docker image: `nodered/node-red:latest`
2. Keep Docker image updated regularly
3. Run Node-RED behind a reverse proxy
4. Restrict network access to Node-RED web interface
5. Wait for Node-RED team to release updates

For **home/lab use**: The vulnerabilities are not a practical concern.

## Next Steps: Commission Your Device

Now that the plugin is installed, let's add your door sensor!

### Step 1: Access Matter Controller

1. Open Node-RED: http://localhost:1880
2. Drag "matter device" node to canvas
3. Double-click it
4. Click pencil icon (✏️) next to "Controller"

### Step 2: Save the Controller First

**Important**: Before commissioning devices:
1. Give your controller a name (e.g., "Home Matter")
2. Click **"Add"** button (bottom of dialog)
3. Click **"Deploy"** (top right of Node-RED)
4. Wait 10-15 seconds

### Step 3: Reopen and Commission

1. Double-click the "matter device" node again
2. Click pencil icon to edit controller
3. Now you'll see the commissioning section
4. Put your door sensor in pairing mode
5. Enter the pairing code (11-digit number or from QR code)
6. Optional: Give it a name like "Front Door"
7. Click **"Commission Device"**
8. Wait 30-60 seconds

### Step 4: Select Your Device

1. After successful commissioning, click "Update" or "Done"
2. In the matter device node:
   - Controller: Should show your controller
   - Device: Select your door sensor from dropdown
   - Type: Select "Contact Sensor"
   - Output on state change: ✓ (checked)
3. Click "Done"

### Step 5: Add Debug and Test

1. Drag a "debug" node onto the canvas
2. Connect: matter device → debug
3. Click **"Deploy"**
4. Open debug panel (bug icon on right)
5. Open/close your door
6. See messages appear! 🎉

## Troubleshooting

### Plugin doesn't appear in palette

```bash
# Check installation
docker exec nodered npm list | grep matter

# Should show:
# └── node-red-contrib-matter@0.1.0

# If not found, reinstall:
docker exec nodered sh -c "cd /data && npm install ./nodered-matter"
docker restart nodered
```

### "Controller node not found" error

- You need to save the controller first!
- Click "Add" in controller config
- Deploy the flow
- Reopen controller to commission

### Can't commission device

Enable host networking in docker-compose.yml:
```yaml
services:
  nodered:
    network_mode: host
```

Then:
```bash
docker-compose down
docker-compose up -d
# Reinstall plugin if needed
```

### Device won't connect

1. Check device is in pairing mode (LED blinking)
2. Verify pairing code is correct
3. Ensure device is close during commissioning
4. Check Docker logs: `docker logs nodered`

## Full Documentation

- **Docker Setup**: [DOCKER_INSTALL.md](DOCKER_INSTALL.md)
- **Quick Start**: [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Usage Guide**: [USAGE_NOTES.md](USAGE_NOTES.md)

## Success Checklist

- [ ] Node-RED running in Docker
- [ ] Plugin installed (matter device node visible)
- [ ] Matter Controller created and saved
- [ ] Flow deployed
- [ ] Device commissioned with pairing code
- [ ] Device selected in node configuration
- [ ] Debug node connected and deployed
- [ ] Messages appearing when door opens/closes

🎉 Once all checked, you're successfully monitoring your Matter door sensor!

---

**Note**: Installation is complete! The npm vulnerabilities shown are in Node-RED's packages, not the Matter plugin, and are safe to ignore for local use.

