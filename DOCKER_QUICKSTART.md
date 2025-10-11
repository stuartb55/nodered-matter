# Quick Docker Install - 3 Commands

Get your Matter door sensor working in Docker Node-RED in under 2 minutes!

## Prerequisites

- ✅ Node-RED running in Docker
- ✅ Container name (default: `nodered`)
- ✅ Your container has a persistent `/data` volume

## Three Commands

### 1. Copy Plugin

```powershell
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter
```

Replace `nodered` with your actual container name if different.

### 2. Install Plugin

```powershell
docker exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"
```

Wait ~30 seconds for installation to complete.

### 3. Restart Node-RED

```powershell
docker restart nodered
```

## Verify Installation

1. Open Node-RED: http://localhost:1880
2. Look for **"Matter"** category in the left palette
3. You should see the **"matter device"** node

## If Your Container Has a Different Name

Find your container name:
```powershell
docker ps | findstr node-red
```

Then replace `nodered` with your container name in the commands above.

## Next Steps

Once installed:

1. **Commission your sensor**: 
   - Drag a "matter device" node onto the canvas
   - Double-click to configure
   - Create a Matter Controller
   - Enter your sensor's pairing code
   - Click "Commission Device"

2. **Test it**:
   - Add a debug node
   - Connect matter device → debug
   - Deploy
   - Open/close your door
   - Watch messages in debug panel!

## Network Configuration

**Important for Matter devices:**

Matter needs network access to your devices. If commissioning fails, you may need host networking:

### Check Current Setup

```powershell
docker inspect nodered | findstr NetworkMode
```

### If You Need Host Networking

Add to your docker-compose.yml:
```yaml
services:
  nodered:
    network_mode: host
```

Or recreate container:
```powershell
docker stop nodered
docker rm nodered
docker run -d --name nodered --network host -v nodered-data:/data nodered/node-red:latest
```

Then repeat the 3 installation commands.

## Troubleshooting

### Can't find container

```powershell
# List all containers
docker ps -a

# If stopped, start it
docker start nodered
```

### Permission errors

```powershell
docker exec nodered chown -R node-red:node-red /data/node-red-contrib-matter
docker restart nodered
```

### Module not found

```powershell
# Reinstall dependencies
docker exec nodered sh -c "cd /data/node-red-contrib-matter && npm install"
docker restart nodered
```

### Plugin doesn't appear

```powershell
# Check if installed
docker exec nodered npm list | findstr matter

# Check logs
docker logs nodered
```

## Full Documentation

- **Complete Docker guide**: [DOCKER_INSTALL.md](DOCKER_INSTALL.md)
- **Sensor setup**: [QUICKSTART.md](QUICKSTART.md)
- **Usage guide**: [USAGE_NOTES.md](USAGE_NOTES.md)
- **Full docs**: [README.md](README.md)

## Example Commands with Common Container Names

### If your container is named "nodered"
```powershell
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter
docker exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"
docker restart nodered
```

### If your container is named "node-red"
```powershell
docker cp C:\Users\stuar\Cursor\noderedmatter node-red:/data/node-red-contrib-matter
docker exec node-red sh -c "cd /data && npm install ./node-red-contrib-matter"
docker restart node-red
```

### If using docker-compose
```powershell
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter
docker-compose exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"
docker-compose restart nodered
```

That's it! Your Matter plugin is ready to use. Now commission your door sensor and start building automations! 🚪✨

