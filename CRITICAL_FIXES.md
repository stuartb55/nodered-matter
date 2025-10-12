# Critical Fixes Required

This document contains the specific code changes needed to fix critical issues identified in the peer review.

## Fix #1: Commissioning Error Status Bug

**File:** `nodes/matter-controller.js`  
**Lines:** 134-137

### Current Code (WRONG):
```javascript
} catch (error) {
    node.status({ fill: "green", shape: "dot", text: "connected" });
    throw new Error(`Commissioning failed: ${error.message}`);
}
```

### Fixed Code:
```javascript
} catch (error) {
    node.status({ fill: "red", shape: "ring", text: "commission failed" });
    node.error(`Commissioning failed: ${error.message}`);
    throw error;
}
```

**Why:** The status should show red (error) when commissioning fails, not green (success).

---

## Fix #2: Infinite Wait Loop with No Timeout

**File:** `nodes/matter-device.js`  
**Lines:** 24-30

### Current Code (PROBLEMATIC):
```javascript
function waitForController() {
    if (node.controller.isInitialized) {
        initializeDevice();
    } else {
        setTimeout(waitForController, 1000);
    }
}
```

### Fixed Code:
```javascript
let retryCount = 0;
const MAX_RETRIES = 30; // 30 seconds timeout

function waitForController() {
    if (node.controller.isInitialized) {
        retryCount = 0; // Reset on success
        initializeDevice();
    } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(waitForController, 1000);
    } else {
        node.status({ fill: "red", shape: "ring", text: "controller timeout" });
        node.error("Controller failed to initialize within 30 seconds. Check controller configuration and deploy status.");
    }
}
```

**Why:** Prevents infinite loop if controller never initializes.

---

## Fix #3: Missing Subscription Cleanup

**File:** `nodes/matter-device.js`  
**Location:** Multiple sections need modification

### Add at module level (after line 20):
```javascript
let pollTimer = null;
let isSubscribed = false;
let subscriptionHandle = null; // ADD THIS LINE
```

### Modify subscribeToDevice function (lines 67-96):
```javascript
async function subscribeToDevice() {
    try {
        // Store the subscription handle for cleanup
        subscriptionHandle = await node.controller.subscribeToDevice(
            node.deviceId,
            node.deviceType,
            (state) => {
                // Update status
                updateStatus(state);
                
                // Send message
                node.send({
                    payload: state.contact,
                    state: state.state,
                    topic: `matter/${node.deviceId}`,
                    device: {
                        nodeId: node.deviceId,
                        type: node.deviceType
                    },
                    timestamp: state.timestamp
                });
            }
        );
        
        isSubscribed = true;
        node.log(`Subscribed to device ${node.deviceId}`);
        
    } catch (error) {
        node.warn(`Failed to subscribe to device: ${error.message}`);
        subscriptionHandle = null;
        // Continue even if subscription fails - polling can still work
    }
}
```

### Update close handler (lines 151-156):
```javascript
// Cleanup on close
node.on('close', async function(done) {
    const closeTimeout = setTimeout(() => {
        node.warn("Device node close operation timed out");
        done();
    }, 3000);
    
    try {
        // Clear polling timer
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        
        // Unsubscribe from device updates
        if (subscriptionHandle && node.controller) {
            try {
                // Note: The actual unsubscribe implementation depends on 
                // what subscribeToDevice returns. This may need adjustment.
                if (typeof subscriptionHandle.unsubscribe === 'function') {
                    await subscriptionHandle.unsubscribe();
                }
            } catch (err) {
                node.warn(`Failed to unsubscribe: ${err.message}`);
            }
        }
        
        clearTimeout(closeTimeout);
        done();
    } catch (error) {
        clearTimeout(closeTimeout);
        node.error(`Error during close: ${error.message}`);
        done();
    }
});
```

**Why:** Prevents resource leaks from uncleared subscriptions.

---

## Fix #4: Matter Controller Subscription Return Value

**File:** `nodes/matter-controller.js`  
**Lines:** 200-249

### Update subscribeToDevice function:
```javascript
// Subscribe to device state changes
node.subscribeToDevice = async function(nodeId, clusterId, callback) {
    const deviceInfo = node.commissionedDevices.get(nodeId);
    if (!deviceInfo) {
        throw new Error(`Device ${nodeId} not found`);
    }
    
    try {
        const device = deviceInfo.device;
        
        if (clusterId === 'contact' || clusterId === 'booleanState') {
            const endpoints = device.getDevices();
            
            for (const endpoint of endpoints) {
                const clusters = endpoint.getAllClusterClients();
                const booleanStateCluster = clusters.find(c => 
                    c.id === BooleanStateCluster.id
                );
                
                if (booleanStateCluster) {
                    // Subscribe to state changes
                    const unsubscribe = await booleanStateCluster.subscribeStateValueAttribute(
                        (value) => {
                            const state = {
                                nodeId: nodeId,
                                type: 'contact',
                                state: value,
                                contact: value ? 'open' : 'closed',
                                timestamp: new Date().toISOString()
                            };
                            
                            node.deviceStates.set(nodeId, state);
                            callback(state);
                        },
                        0, // minIntervalFloor
                        60 // maxIntervalCeiling (seconds)
                    );
                    
                    node.log(`Subscribed to device ${nodeId} state changes`);
                    
                    // Return an object with unsubscribe method
                    return {
                        unsubscribe: async () => {
                            try {
                                await unsubscribe();
                                node.log(`Unsubscribed from device ${nodeId}`);
                            } catch (err) {
                                node.warn(`Error unsubscribing from device ${nodeId}: ${err.message}`);
                            }
                        }
                    };
                }
            }
        }
        
        throw new Error(`Cluster ${clusterId} not found on device`);
        
    } catch (error) {
        throw new Error(`Failed to subscribe to device: ${error.message}`);
    }
};
```

**Why:** Returns a proper subscription handle that can be cleaned up.

---

## Fix #5: Package.json Main Field

**File:** `package.json`  
**Line:** 5

### Option A: Remove the field (Recommended)
```json
{
  "name": "node-red-contrib-matter",
  "version": "0.1.0",
  "description": "Node-RED nodes for Matter smart home devices",
  // REMOVE THIS LINE: "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

### Option B: Create minimal index.js file
If you want to keep the field, create `index.js`:
```javascript
/**
 * node-red-contrib-matter
 * Node-RED integration for Matter smart home devices
 */

module.exports = {
  name: 'node-red-contrib-matter',
  version: require('./package.json').version,
  description: 'Node-RED nodes for Matter smart home devices'
};
```

**Why:** Package should not reference non-existent entry point. For Node-RED contrib packages, this field is typically not needed.

---

## Fix #6: Remove Pairing Code from Logs (Security)

**File:** `nodes/matter-controller.js`  
**Lines:** 87, 103

### Current Code:
```javascript
node.log(`Commissioning device with code: ${pairingCode}`);
node.log(`Parsed commissioning data:`, commissioningData);
```

### Fixed Code:
```javascript
// Don't log the actual pairing code for security
const codeType = pairingCode.startsWith('MT:') ? 'QR Code' : 'Manual Code';
node.log(`Commissioning device with ${codeType} (code length: ${pairingCode.length})`);

// Only log non-sensitive parts of commissioning data
node.log(`Commissioning data parsed successfully (discriminator: ${commissioningData.discriminator})`);
```

**Why:** Pairing codes are sensitive and should not appear in logs.

---

## Fix #7: Add Input Validation for Pairing Codes

**File:** `nodes/matter-controller.js`  
**After line 283** (in the HTTP endpoint)

### Add validation:
```javascript
RED.httpAdmin.post("/matter-controller/:id/commission", RED.auth.needsPermission('matter-controller.write'), async function(req, res) {
    console.log("[Matter] Commission request for node ID:", req.params.id);
    const node = RED.nodes.getNode(req.params.id);
    console.log("[Matter] Found node:", node ? "YES" : "NO");
    if (!node) {
        console.log("[Matter] ERROR: Controller node not found for ID:", req.params.id);
        res.status(404).json({ error: "Controller node not found", nodeId: req.params.id });
        return;
    }
    
    const { pairingCode, deviceName } = req.body;
    
    // Validate pairing code presence
    if (!pairingCode) {
        res.status(400).json({ error: "Pairing code is required" });
        return;
    }
    
    // ADD THIS VALIDATION:
    // Validate pairing code format
    const sanitizedCode = pairingCode.trim();
    const isQRCode = sanitizedCode.startsWith('MT:');
    const isManualCode = /^\d{8,11}(-\d{4,8})?$/.test(sanitizedCode.replace(/-/g, ''));
    
    if (!isQRCode && !isManualCode) {
        res.status(400).json({ 
            error: "Invalid pairing code format",
            details: "Expected QR code starting with 'MT:' or 11-digit manual pairing code"
        });
        return;
    }
    
    try {
        const result = await node.commissionDevice(sanitizedCode, deviceName);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**Why:** Prevents confusing errors by validating format before attempting to commission.

---

## Fix #8: Replace console.log with node.log

**File:** `nodes/matter-controller.js`  
**Lines:** 22, 273, 274, 275, 276, 298, 299, 301

### Find and Replace:
```javascript
// Replace all instances of:
console.log("[Matter] ...");

// With:
node.log("...");  // In controller methods

// Or with:
RED.log.info("...");  // In HTTP endpoints where 'node' is a different variable
```

**Example - Line 273:**
```javascript
// Before:
console.log("[Matter] Commission request for node ID:", req.params.id);

// After:
RED.log.info(`[Matter] Commission request for node ID: ${req.params.id}`);
```

**Why:** Consistent logging through Node-RED's logging system allows better filtering and control.

---

## Fix #9: Add Storage Directory Creation

**File:** `nodes/matter-controller.js`  
**After line 20** (before initializing Matter)

### Add directory creation:
```javascript
const fs = require('fs');  // Add at top of file

// ... inside initMatterController function, before line 28:

async function initMatterController() {
    try {
        // ADD THIS: Ensure storage directory exists
        try {
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true, mode: 0o755 });
                node.log(`Created storage directory: ${storageDir}`);
            }
        } catch (fsError) {
            node.error(`Failed to create storage directory: ${fsError.message}`);
            node.status({ fill: "red", shape: "ring", text: "storage error" });
            return;
        }
        
        // Create storage backend (existing code)
        const storageManager = new StorageManager(new StorageBackendDisk(storageDir));
        // ... rest of function
```

**Why:** Explicit directory creation with proper error handling prevents cryptic errors on first run.

---

## Fix #10: Add Error Recovery for Device Reads

**File:** `nodes/matter-device.js`  
**Lines:** 99-127

### Replace pollDevice function:
```javascript
let errorCount = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

async function pollDevice() {
    try {
        const state = await node.controller.readDeviceState(
            node.deviceId,
            node.deviceType
        );
        
        // Reset error count on successful read
        errorCount = 0;
        
        // Update status
        updateStatus(state);
        
        // Send message (only if not using subscription, or as initial read)
        if (!isSubscribed || !pollTimer) {
            node.send({
                payload: state.contact,
                state: state.state,
                topic: `matter/${node.deviceId}`,
                device: {
                    nodeId: node.deviceId,
                    type: node.deviceType
                },
                timestamp: state.timestamp
            });
        }
        
    } catch (error) {
        errorCount++;
        
        if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
            node.error(`Device ${node.deviceId} appears offline after ${errorCount} failed attempts: ${error.message}`);
            node.status({ fill: "red", shape: "ring", text: "device offline" });
            
            // Stop aggressive polling if device is offline
            if (pollTimer && node.pollInterval < 60) {
                clearInterval(pollTimer);
                // Switch to slower polling (every 60 seconds)
                pollTimer = setInterval(pollDevice, 60000);
                node.warn("Switched to reduced polling rate due to errors");
            }
        } else {
            node.warn(`Failed to read device state (attempt ${errorCount}/${MAX_CONSECUTIVE_ERRORS}): ${error.message}`);
            node.status({ fill: "yellow", shape: "ring", text: `retry ${errorCount}` });
        }
    }
}
```

**Why:** Provides graceful degradation instead of constant error messages, and adjusts polling rate when device is offline.

---

## Application Priority

Apply these fixes in this order:

1. ✅ **Fix #1** - Commissioning status bug (trivial, critical)
2. ✅ **Fix #5** - Package.json main field (trivial)
3. ✅ **Fix #6** - Remove pairing code from logs (security)
4. ✅ **Fix #7** - Add input validation (prevents errors)
5. ✅ **Fix #8** - Replace console.log (best practice)
6. ✅ **Fix #2** - Infinite wait loop (prevents hang)
7. ✅ **Fix #9** - Storage directory creation (prevents errors)
8. ✅ **Fix #10** - Error recovery (improves reliability)
9. ✅ **Fix #4** - Subscription return value (enables cleanup)
10. ✅ **Fix #3** - Subscription cleanup (depends on #4)

## Testing After Fixes

After applying these fixes, test:

1. ✅ Fresh installation (no existing storage)
2. ✅ Commission a new device
3. ✅ Device state updates (subscription)
4. ✅ Node-RED restart (reconnection)
5. ✅ Device offline scenario
6. ✅ Invalid pairing code
7. ✅ Controller initialization timeout
8. ✅ Clean shutdown (check logs for errors)

## Verification Checklist

- [ ] No more green status on commissioning errors
- [ ] Device nodes timeout after 30 seconds if controller doesn't initialize
- [ ] No pairing codes appear in logs
- [ ] Subscriptions are properly cleaned up on node close
- [ ] Storage directory is created automatically
- [ ] Invalid pairing codes are rejected with clear messages
- [ ] Device offline scenarios handled gracefully
- [ ] No console.log statements remain
- [ ] Package can be installed without errors

---

**Note:** These fixes address the critical issues only. See PEER_REVIEW.md for additional improvements to consider.

