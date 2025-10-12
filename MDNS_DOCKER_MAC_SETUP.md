# Enabling mDNS for Matter Devices on Docker Desktop for Mac

## The Issue
Docker Desktop for Mac doesn't support `network_mode: host`, which is the typical solution for mDNS on Linux. However, we can still enable mDNS by properly exposing the required UDP port.

## Solution

### Updated Docker Compose Configuration

```yaml
node-red:
    container_name: node-red
    restart: unless-stopped
    image: nodered/node-red
    environment:
      - TZ=Europe/London
    volumes:
      - /Users/stuart/node-red:/data
    ports:
      - "1880:1880"
      - "1881:1881" # Prometheus metric exporter
      - "5353:5353/udp"  # mDNS for Matter device discovery
      - "5540:5540/udp"  # Matter
    cap_add:
      - NET_ADMIN
```

**Key Change:** Added `5353:5353/udp` for mDNS (multicast DNS) which Matter uses for device discovery.

## How to Apply

### Option 1: Update Your Existing docker-compose.yml

1. Stop your current container:
   ```bash
   docker-compose down
   ```

2. Add the mDNS port to your docker-compose.yml:
   ```yaml
   - "5353:5353/udp"  # mDNS for Matter device discovery
   ```

3. Restart with the updated configuration:
   ```bash
   docker-compose up -d
   ```

### Option 2: Use the docker run command

If you're not using docker-compose, you can recreate your container:

```bash
docker stop node-red
docker rm node-red

docker run -d \
  --name node-red \
  --restart unless-stopped \
  -e TZ=Europe/London \
  -v /Users/stuart/node-red:/data \
  -p 1880:1880 \
  -p 1881:1881 \
  -p 5353:5353/udp \
  -p 5540:5540/udp \
  --cap-add=NET_ADMIN \
  nodered/node-red
```

## Ports Explained

| Port | Protocol | Purpose |
|------|----------|---------|
| 1880 | TCP | Node-RED web interface |
| 1881 | TCP | Prometheus metrics exporter |
| 5353 | UDP | **mDNS - Device discovery (NEW!)** |
| 5540 | UDP | Matter communication |

## Verification Steps

After updating your configuration:

1. **Check the container is running:**
   ```bash
   docker ps | grep node-red
   ```

2. **Verify ports are exposed:**
   ```bash
   docker port node-red
   ```
   
   You should see:
   ```
   1880/tcp -> 0.0.0.0:1880
   1881/tcp -> 0.0.0.0:1881
   5353/udp -> 0.0.0.0:5353
   5540/udp -> 0.0.0.0:5540
   ```

3. **Check mDNS is working:**
   ```bash
   # On your Mac, check if mDNS traffic is flowing
   sudo tcpdump -i any port 5353
   ```
   
   You should see mDNS queries when Matter devices are being discovered.

## Limitations on Docker Desktop for Mac

⚠️ **Important:** Docker Desktop for Mac has some networking limitations:

- **No host networking:** `network_mode: host` doesn't work
- **mDNS multicast limitations:** Docker Desktop for Mac may have issues with mDNS multicast traffic
- **Alternative solution if this doesn't work:** Consider running Node-RED directly on macOS (without Docker) for full Matter support

## If mDNS Still Doesn't Work

If you still have issues discovering Matter devices, you have a few options:

### Alternative 1: Run Node-RED Natively on Mac
Matter/mDNS works best when run directly on the host OS:

```bash
# Install Node-RED on Mac
npm install -g --unsafe-perm node-red

# Start Node-RED
node-red
```

### Alternative 2: Use Docker Desktop Network Bridge
Try connecting to the same network as your Matter devices:

```yaml
node-red:
    container_name: node-red
    restart: unless-stopped
    image: nodered/node-red
    network_mode: bridge  # Explicitly set bridge mode
    environment:
      - TZ=Europe/London
    volumes:
      - /Users/stuart/node-red:/data
    ports:
      - "1880:1880"
      - "1881:1881"
      - "5353:5353/udp"
      - "5540:5540/udp"
    cap_add:
      - NET_ADMIN
```

### Alternative 3: Use Docker Desktop with Host Network Workaround

You can try using macvlan or ipvlan network drivers, but this requires more complex setup.

## Testing Matter Device Discovery

Once configured, test Matter device commissioning:

1. Open Node-RED at http://localhost:1880
2. Add a "matter device" node
3. Configure a Matter Controller
4. Try commissioning a Matter device
5. Check logs for mDNS activity:
   ```bash
   docker logs -f node-red
   ```

## Additional Network Troubleshooting

If you continue to have issues:

1. **Check firewall settings:**
   ```bash
   # Ensure macOS firewall allows UDP 5353
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
   ```

2. **Verify Docker network:**
   ```bash
   docker network inspect bridge
   ```

3. **Check if mDNS responder is running on Mac:**
   ```bash
   sudo launchctl list | grep mDNSResponder
   ```

## Summary

The key change is adding **port 5353/udp** for mDNS. This should enable Matter device discovery on Docker Desktop for Mac. However, due to Docker Desktop's networking limitations on macOS, you may still encounter issues. If so, running Node-RED natively on your Mac is recommended for the best Matter support.

## Quick Commands Reference

```bash
# Stop current container
docker-compose down

# Start with updated config
docker-compose up -d

# Check logs
docker logs -f node-red

# Check ports
docker port node-red

# Test mDNS traffic
sudo tcpdump -i any port 5353
```

Good luck with your Matter setup! 🏠✨
