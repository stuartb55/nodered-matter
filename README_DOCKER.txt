╔══════════════════════════════════════════════════════════════════════════════╗
║                   Node-RED Matter Plugin - Docker Install                   ║
║                          Quick Reference Card                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Copy Plugin to Container                                            │
└──────────────────────────────────────────────────────────────────────────────┘

  docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter

  ⚠ Replace 'nodered' with your container name if different


┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Install Plugin                                                      │
└──────────────────────────────────────────────────────────────────────────────┘

  docker exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"

  ⏱ Wait ~30 seconds for installation


┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Restart Container                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

  docker restart nodered


┌──────────────────────────────────────────────────────────────────────────────┐
│ VERIFY: Check Installation                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

  1. Open Node-RED: http://localhost:1880
  2. Look for "Matter" category in palette (left sidebar)
  3. You should see "matter device" node

  OR check via command line:

  docker exec nodered npm list | findstr matter


┌──────────────────────────────────────────────────────────────────────────────┐
│ COMMISSION YOUR DOOR SENSOR                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

  1. Drag "matter device" node onto canvas
  2. Double-click to configure
  3. Create Matter Controller (click pencil icon)
  4. Enter pairing code from your sensor (11-digit number)
  5. Click "Commission Device"
  6. Wait ~30 seconds
  7. Select device from dropdown
  8. Deploy!


┌──────────────────────────────────────────────────────────────────────────────┐
│ TROUBLESHOOTING                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

  Can't commission device?
  → Enable host networking:
    
    In docker-compose.yml add:
      network_mode: host
    
    Then:
      docker-compose down
      docker-compose up -d
      (Repeat installation steps)

  Plugin not appearing?
  → Check logs:
    docker logs nodered

  Permission errors?
  → Fix permissions:
    docker exec nodered chown -R node-red:node-red /data/node-red-contrib-matter
    docker restart nodered


┌──────────────────────────────────────────────────────────────────────────────┐
│ DOCUMENTATION FILES                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

  DOCKER_QUICKSTART.md    → 3-command Docker install
  DOCKER_INSTALL.md       → Complete Docker guide (all methods)
  QUICKSTART.md           → 5-minute setup guide
  USAGE_NOTES.md          → Door sensor specifics
  SETUP.md                → Detailed setup instructions
  README.md               → Full documentation


┌──────────────────────────────────────────────────────────────────────────────┐
│ EXAMPLE OUTPUT FROM YOUR DOOR SENSOR                                        │
└──────────────────────────────────────────────────────────────────────────────┘

  {
    "payload": "open",              ← "open" or "closed"
    "state": true,                  ← boolean
    "topic": "matter/12345",
    "device": {
      "nodeId": "12345",
      "type": "contact"
    },
    "timestamp": "2025-10-11T12:34:56.789Z"
  }


┌──────────────────────────────────────────────────────────────────────────────┐
│ USEFUL DOCKER COMMANDS                                                      │
└──────────────────────────────────────────────────────────────────────────────┘

  Find container name:
    docker ps | findstr node-red

  View logs:
    docker logs nodered
    docker logs -f nodered          (follow mode)

  Check if plugin installed:
    docker exec nodered npm list | findstr matter

  Access container shell:
    docker exec -it nodered /bin/bash

  Check data directory:
    docker exec nodered ls -la /data

  Check Matter storage:
    docker exec nodered ls -la /data/.node-red-matter


╔══════════════════════════════════════════════════════════════════════════════╗
║  Need help? Check DOCKER_INSTALL.md for detailed troubleshooting           ║
╚══════════════════════════════════════════════════════════════════════════════╝

