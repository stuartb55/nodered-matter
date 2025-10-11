# Installing node-red-contrib-matter in Docker

## Overview

There are several methods to install this plugin in a Node-RED Docker container. Choose the method that best fits your setup.

## Method 1: Install via npm in Running Container (Easiest)

This method works if you have a running Node-RED Docker container with persistent data.

### Step 1: Copy Plugin to Container

```powershell
# From Windows PowerShell
# Replace 'nodered' with your actual container name
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter
```

### Step 2: Install Dependencies Inside Container

```powershell
# Access the container shell
docker exec -it nodered /bin/bash

# Once inside the container:
cd /data/node-red-contrib-matter
npm install

# Link it to Node-RED
cd /data
npm install ./node-red-contrib-matter

# Exit the container
exit
```

### Step 3: Restart Container

```powershell
docker restart nodered
```

## Method 2: Install via npm from Container Shell (If you have internet in container)

If your container has internet access and you want to install from the local directory:

```powershell
# Copy the plugin
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/tmp/node-red-contrib-matter

# Execute installation
docker exec -it nodered /bin/bash -c "cd /data && npm install /tmp/node-red-contrib-matter"

# Restart
docker restart nodered
```

## Method 3: Mount as Volume (Best for Development)

If you're actively developing the plugin, mount it as a volume:

### Option A: Add to docker-compose.yml

```yaml
version: '3.8'
services:
  nodered:
    image: nodered/node-red:latest
    ports:
      - "1880:1880"
    volumes:
      - nodered-data:/data
      - C:\Users\stuar\Cursor\noderedmatter:/data/node_modules/node-red-contrib-matter
    environment:
      - TZ=America/New_York

volumes:
  nodered-data:
```

Then:
```powershell
docker-compose down
docker-compose up -d
```

### Option B: Docker Run Command

```powershell
docker run -d \
  --name nodered \
  -p 1880:1880 \
  -v nodered-data:/data \
  -v C:\Users\stuar\Cursor\noderedmatter:/data/node_modules/node-red-contrib-matter \
  nodered/node-red:latest
```

## Method 4: Custom Dockerfile (Best for Production)

Create a custom Docker image with the plugin pre-installed.

### Step 1: Create Dockerfile

Create `Dockerfile` in `C:\Users\stuar\Cursor\noderedmatter\`:

```dockerfile
FROM nodered/node-red:latest

# Copy plugin files
COPY --chown=node-red:node-red . /data/node-red-contrib-matter/

# Install plugin dependencies
WORKDIR /data/node-red-contrib-matter
RUN npm install

# Install plugin in Node-RED
WORKDIR /data
RUN npm install ./node-red-contrib-matter

# Switch back to Node-RED user
USER node-red
WORKDIR /data

# Expose Node-RED port
EXPOSE 1880

# Start Node-RED
CMD ["node-red"]
```

### Step 2: Build Custom Image

```powershell
cd C:\Users\stuar\Cursor\noderedmatter
docker build -t nodered-matter:latest .
```

### Step 3: Run Your Custom Image

```powershell
docker run -d \
  --name nodered-matter \
  -p 1880:1880 \
  -v nodered-data:/data \
  nodered-matter:latest
```

Or with docker-compose:

```yaml
version: '3.8'
services:
  nodered:
    build:
      context: C:\Users\stuar\Cursor\noderedmatter
      dockerfile: Dockerfile
    ports:
      - "1880:1880"
    volumes:
      - nodered-data:/data
    restart: unless-stopped

volumes:
  nodered-data:
```

## Method 5: Package.json in Data Volume (Persistent Installation)

This method adds the plugin to Node-RED's package.json in the data volume.

### Step 1: Copy Plugin to Accessible Location

```powershell
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/tmp/node-red-contrib-matter
```

### Step 2: Install via Package.json

```powershell
docker exec -it nodered /bin/bash

# Inside container:
cd /data
npm install /tmp/node-red-contrib-matter --save

exit
```

### Step 3: Restart

```powershell
docker restart nodered
```

## Verifying Installation

After installation with any method:

### 1. Check Logs

```powershell
docker logs nodered
```

Look for:
- No errors during startup
- Node-RED starting successfully
- No "module not found" errors

### 2. Check Installed Packages

```powershell
docker exec nodered npm list --depth=0 | grep matter
```

Should show: `node-red-contrib-matter@0.1.0`

### 3. Check in Node-RED UI

1. Open http://localhost:1880 (or your Docker host IP)
2. Look for "Matter" category in the palette
3. You should see the "matter device" node

## Important Docker Considerations

### Persistent Storage

Make sure your Node-RED data directory is persistent:

```yaml
volumes:
  - nodered-data:/data  # This persists flows, settings, and installed nodes
```

Without this, you'll lose your installation on container restart!

### Matter Storage Location

The plugin stores device data in `/data/.node-red-matter/` inside the container. This directory MUST be in a persistent volume:

```yaml
volumes:
  - nodered-data:/data  # Includes .node-red-matter
```

### Network Requirements

Matter devices need network access. Depending on your setup:

**For Thread-based Matter devices:**
- May need host network mode: `network_mode: host`
- Or proper network configuration to access Thread border router

**For WiFi-based Matter devices:**
- Container needs to be on same network as devices
- May need host network mode for device discovery

### Example docker-compose.yml with Host Network

```yaml
version: '3.8'
services:
  nodered:
    image: nodered/node-red:latest
    network_mode: host  # Allows Matter device discovery
    volumes:
      - nodered-data:/data
    environment:
      - TZ=America/New_York
    restart: unless-stopped

volumes:
  nodered-data:
```

Then install plugin using Method 1 or 2.

### Permissions

The plugin needs to write to `/data/.node-red-matter/`. Ensure proper permissions:

```powershell
docker exec nodered ls -la /data/.node-red-matter/
```

Should be owned by `node-red:node-red` (UID 1000 typically).

## Recommended Setup for Your Use Case

For your door contact sensor, I recommend:

### Quick Setup (Method 1)

1. **Copy plugin to container:**
   ```powershell
   docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter
   ```

2. **Install it:**
   ```powershell
   docker exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"
   ```

3. **Restart:**
   ```powershell
   docker restart nodered
   ```

4. **Verify:**
   - Open Node-RED UI
   - Look for "matter device" node
   - Configure and commission your sensor

### Production Setup (Method 4)

If you want a clean, repeatable setup:

1. Use the Dockerfile method (Method 4)
2. Build your custom image
3. Use docker-compose with host networking
4. Data persists in named volume

## Troubleshooting Docker Installation

### Plugin not appearing in Node-RED

```powershell
# Check if plugin is installed
docker exec nodered npm list | grep matter

# Check Node-RED logs
docker logs nodered

# Check node_modules
docker exec nodered ls -la /data/node_modules/ | grep matter
```

### Permission denied errors

```powershell
# Fix permissions
docker exec nodered chown -R node-red:node-red /data/node-red-contrib-matter
docker exec nodered chown -R node-red:node-red /data/.node-red-matter
docker restart nodered
```

### Module not found errors

```powershell
# Reinstall dependencies inside container
docker exec nodered sh -c "cd /data/node-red-contrib-matter && npm install"
docker restart nodered
```

### Matter device commissioning fails

- Enable host networking mode
- Check container can reach devices:
  ```powershell
  docker exec nodered ping [device-ip]
  ```
- Ensure UDP ports are accessible (Matter uses UDP 5540, 5353)

### Can't connect to devices after restart

- Verify `/data` volume is persistent
- Check `.node-red-matter` directory exists:
  ```powershell
  docker exec nodered ls -la /data/.node-red-matter/
  ```
- Ensure proper permissions on storage directory

## Complete Docker-Compose Example

Here's a complete working example:

```yaml
version: '3.8'

services:
  nodered:
    image: nodered/node-red:latest
    container_name: nodered-matter
    network_mode: host  # Required for Matter device discovery
    volumes:
      - nodered-data:/data
      - /etc/localtime:/etc/localtime:ro  # Sync timezone
    environment:
      - TZ=America/New_York
      - NODE_RED_ENABLE_SAFE_MODE=false
    restart: unless-stopped
    user: "1000:1000"  # node-red user

volumes:
  nodered-data:
    driver: local
```

**Setup steps:**
1. Save as `docker-compose.yml`
2. Run: `docker-compose up -d`
3. Install plugin using Method 1
4. Commission your door sensor
5. Build your automations!

## Next Steps After Installation

1. ✅ Verify plugin appears in Node-RED palette
2. ✅ Read `QUICKSTART.md` for commissioning your sensor
3. ✅ Import example from `examples/contact-sensor-flow.json`
4. ✅ Commission your door sensor
5. ✅ Build your automation flows!

## Need Help?

If you run into issues:
- Check `docker logs nodered` for errors
- Ensure data volume is persistent
- Verify host networking is enabled (for device discovery)
- Check permissions on `/data` directory
- Review Node-RED logs at http://localhost:1880 (debug panel)

Happy automating with Docker! 🐳🏠

