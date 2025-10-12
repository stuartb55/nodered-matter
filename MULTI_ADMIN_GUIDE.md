# Multi-Admin Commissioning Guide

## What is Multi-Admin?

**Multi-Admin** (also called **Multi-Fabric**) is a Matter feature that allows a single device to be controlled by multiple smart home controllers simultaneously.

### Example Scenario

Your Aqara door sensor can be:
- ✅ Controlled by Aqara Hub (primary)
- ✅ Controlled by Node-RED (secondary)
- ✅ Controlled by Alexa (tertiary)
- ✅ All at the same time!

Each controller operates independently, and the device responds to all of them.

---

## When to Use Multi-Admin

### ✅ Use Multi-Admin When:

1. **Device already paired** with another controller (Aqara, Google, Apple, Amazon)
2. **Want to keep existing control** while adding Node-RED
3. **Using manufacturer's ecosystem** but want Node-RED automation
4. **Have existing automations** you don't want to break

### ❌ Don't Use Multi-Admin When:

1. **Fresh device** (factory reset) - use initial commissioning
2. **Exclusive Node-RED control** desired - faster and simpler
3. **Testing/development** - initial commissioning is easier to debug
4. **Device has only been on test fabric** - reset and commission fresh

---

## How Multi-Admin Works in Matter

### Technical Overview

**Matter Fabrics:**
- Each controller creates a "fabric" (secure relationship with device)
- Device can have up to **16 fabrics** (per Matter spec)
- Each fabric has its own encryption keys
- Fabrics are independent - one controller can't see others

**Commissioning Process:**
1. **Primary fabric** already exists (e.g., Aqara)
2. Primary generates **commissioner/sharing code**
3. Secondary controller (Node-RED) uses this code
4. Device adds Node-RED as **Fabric #2**
5. Both controllers can now access device

---

## Step-by-Step: Node-RED Multi-Admin

### Prerequisites

- ✅ Device already commissioned to primary controller (Aqara, Google, etc.)
- ✅ Device working with primary controller
- ✅ Node-RED Matter nodes installed
- ✅ Primary controller app accessible

### Method 1: Using Node-RED UI

**Step 1: Open Primary Controller App**
- Open Aqara Home app (or Google Home, Apple Home, etc.)
- Find your Matter device
- Look for "Share" or "Add to another app" option

**Step 2: Generate Sharing Code**
- In Aqara: Device → Settings → "Add to other platform"
- App will generate a **commissioner code** or **sharing code**
- This code is valid for ~3-5 minutes (varies by manufacturer)
- Code format: 11-digit manual code or QR code starting with `MT:`

**Step 3: Open Node-RED Matter Controller**
- Double-click Matter Controller node in Node-RED
- Or open Configuration Nodes → Matter Controller

**Step 4: Configure Commissioning**
- **Pairing Code:** Enter the sharing code from Step 2
- **Device Name:** Give it a name (e.g., "Front Door")
- **☑ Multi-Admin Mode:** CHECK THIS BOX! (Important!)
- Click "Commission Device"

**Step 5: Wait for Completion**
- Process takes 30-60 seconds
- Status will show "Adding fabric..."
- Success message: "Device added to Node-RED fabric (multi-admin)"

**Step 6: Verify**
- Device should appear in commissioned devices list
- Try reading device state in Node-RED
- Verify primary controller still works

### Method 2: Using Test Scripts

**Option A: Interactive Mode**

```bash
node test-matter-standalone.js

# Choose: 1. Commission new device
# Choose: 2. Multi-admin (add to existing device)
# Enter sharing code from Aqara app
# Enter device name
```

**Option B: Command Line**

```bash
# Get sharing code from Aqara app, then:
node test-matter-commission.js 16425630388 "Front Door" --multi-admin
```

---

## Getting Sharing Codes from Common Controllers

### Aqara Hub

1. Open **Aqara Home** app
2. Select your Matter device
3. Tap **Settings** (gear icon)
4. Look for:
   - "Add to other platform"
   - "Share device"
   - "Matter pairing code"
5. App shows **11-digit code** or QR code
6. Code valid for ~3 minutes

### Google Home

1. Open **Google Home** app
2. Select Matter device
3. Tap **Settings** → **Device information**
4. Select **"Share device"**
5. Choose **"Matter"**
6. Copy/scan the sharing code

### Apple Home

1. Open **Home** app on iPhone/iPad
2. Long press on Matter device
3. Tap **Settings** → **"Add to another app"**
4. Select **"Use with Matter"**
5. Show QR code or manual code

### Amazon Alexa

1. Open **Alexa** app
2. Devices → Select Matter device
3. Settings → **"Share device"**
4. Generate Matter sharing code

---

## Troubleshooting Multi-Admin

### Error: "Received incorrect key confirmation"

**Cause:** Wrong code, expired code, or device not ready

**Solution:**
1. ✅ Verify code is **sharing/commissioner code** (NOT original device code)
2. ✅ Generate fresh code (they expire quickly)
3. ✅ Ensure device is powered on and connected
4. ✅ Try again immediately after generating code

### Error: "Device not found" or "Timeout"

**Cause:** Network issues or device not advertising

**Solution:**
1. ✅ Device must be powered on and connected
2. ✅ Check device is on same network
3. ✅ Wait 10 seconds after generating code
4. ✅ Move device closer during commissioning

### Error: "Already commissioned"

**Cause:** Trying to use initial commissioning code on already-paired device

**Solution:**
1. ✅ CHECK "Multi-Admin Mode" checkbox in Node-RED
2. ✅ Use sharing code from primary controller (not device label)
3. ✅ Or: Factory reset device for initial commissioning

### Success but Can't Read State

**Cause:** Device might need time to sync fabric data

**Solution:**
1. ✅ Wait 30 seconds after successful commissioning
2. ✅ Try manual read (inject node → device node)
3. ✅ Restart Node-RED
4. ✅ Check device is still connected to primary controller

### Primary Controller Stops Working

**Rare but possible:**

**Solution:**
1. Factory reset device
2. Re-commission to primary controller first
3. Then add Node-RED using multi-admin
4. Report issue to device manufacturer (spec violation)

---

## Best Practices

### ✅ Do's

1. **Keep primary controller operational**
   - Don't delete device from primary app
   - Primary fabric should remain active

2. **Use descriptive names**
   - Same name in Node-RED as primary controller
   - Helps identify devices across platforms

3. **Test primary controller first**
   - Ensure device works in Aqara/Google/etc.
   - Verify it's stable before adding fabrics

4. **Generate fresh codes**
   - Don't reuse old sharing codes
   - Generate new code each attempt

5. **Document fabric setup**
   - Note which controllers have which devices
   - Helps troubleshooting later

### ❌ Don'ts

1. **Don't factory reset while multi-fabric**
   - Will break all fabrics
   - Need to re-commission everywhere

2. **Don't use device pairing code**
   - Use commissioner/sharing code from app
   - Device label code is for initial only

3. **Don't remove from primary too soon**
   - Wait until Node-RED is working
   - Can break both if done wrong

4. **Don't exceed 16 fabrics**
   - Matter limit is 16 controllers per device
   - Unlikely to hit, but possible

5. **Don't mix commissioning types**
   - Use multi-admin flag consistently
   - Don't try initial mode on paired device

---

## Verifying Multi-Admin Success

### In Node-RED

```
✓ Device appears in commissioned devices list
✓ Can read device state
✓ State updates arrive
✓ Node status shows connected (green)
```

### In Primary Controller (Aqara/Google/etc.)

```
✓ Device still appears in app
✓ Can still control device
✓ Device responds to app commands
✓ Automations still work
```

### Both Work Simultaneously

```
✓ Change in Aqara app → Node-RED sees update
✓ Change via Node-RED → Aqara app sees update
✓ Both controllers show same state
✓ No conflicts or errors
```

---

## Architecture Diagram

```
                     ┌──────────────────┐
                     │  Matter Device   │
                     │  (Door Sensor)   │
                     └────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            │                 │                 │
      ┌─────▼─────┐     ┌────▼────┐      ┌────▼─────┐
      │  Fabric 1 │     │Fabric 2 │      │ Fabric 3 │
      │  (Aqara)  │     │(Node-RED)│      │ (Alexa)  │
      └───────────┘     └─────────┘      └──────────┘
           │                 │                  │
    Primary Control   Secondary Control  Tertiary Control
    - Automations     - Node-RED flows   - Voice commands
    - Native UI       - MQTT publish     - Routines
    - Cloud sync      - Data logging     - Scenes
```

Each fabric operates independently but sees the same device state.

---

## Use Cases

### Use Case 1: Aqara + Node-RED

**Scenario:** Door sensor with Aqara Hub, want Node-RED automations

**Setup:**
1. Aqara Hub: Primary control, manufacturer automations
2. Node-RED: Data logging, complex automations, MQTT

**Benefits:**
- Keep Aqara app for easy control
- Use Node-RED for advanced automation
- Both systems work together

### Use Case 2: Google Home + Node-RED

**Scenario:** Smart plug with Google Home, add Node-RED monitoring

**Setup:**
1. Google Home: Voice control, scenes
2. Node-RED: Power monitoring, schedules, notifications

**Benefits:**
- Family uses Google Assistant
- You get detailed monitoring
- Seamless integration

### Use Case 3: Multiple Locations

**Scenario:** Device accessible from different controllers

**Setup:**
1. Apple Home: Local control
2. Node-RED: Remote access, logging
3. Alexa: Voice control

**Benefits:**
- Redundancy (if one controller fails)
- Different interfaces for different needs
- Unified device across ecosystems

---

## Performance Considerations

### Network Traffic

- Each fabric polls/subscribes independently
- More fabrics = more network activity
- Generally negligible for sensors
- Consider for battery-powered devices

### Device Limitations

- Matter spec allows 16 fabrics
- Some devices limit to fewer (check manufacturer)
- Older devices may be slower with multiple fabrics

### Recommendations

- **1-3 fabrics:** Optimal for most use cases
- **4-8 fabrics:** Fine, but consider necessity
- **9+ fabrics:** Rarely needed, may impact performance

---

## Security Implications

### Good News

✅ Each fabric has independent encryption keys
✅ Fabrics can't see each other's communications
✅ Device enforces access control per fabric
✅ No shared secrets between controllers

### Important Notes

⚠️ All fabrics have full device access
⚠️ Any fabric can factory reset device (removes all fabrics)
⚠️ Physical access to device allows new fabric addition
⚠️ Sharing codes should be treated as temporary passwords

### Best Practices

1. Only add trusted controllers
2. Don't share commissioner codes publicly
3. Remove unused fabrics (if device supports it)
4. Keep primary controller secure

---

## FAQ

**Q: Can I remove Node-RED fabric later?**
A: Yes, but device support varies. Some devices allow fabric removal, others require factory reset.

**Q: Which fabric is "primary"?**
A: The first one added. But all fabrics have equal privileges in Matter.

**Q: Can fabrics conflict?**
A: No, Matter handles this. All fabrics see the same state.

**Q: Does multi-admin cost more resources?**
A: Minimal. Slightly more network traffic per fabric.

**Q: Can I add Node-RED first, then Aqara?**
A: Yes! Any fabric can be first. Order doesn't matter.

**Q: Will removing Aqara break Node-RED?**
A: No, each fabric is independent. Node-RED will continue working.

**Q: How do I see all fabrics on a device?**
A: Device must expose this via clusters. Not all manufacturers implement it.

**Q: Can I use different device names per fabric?**
A: Yes! Each controller can name the device independently.

---

## Comparison: Multi-Admin vs. Initial

| Feature | Initial Commissioning | Multi-Admin |
|---------|----------------------|-------------|
| **Device State** | Fresh/Factory Reset | Already Paired |
| **Code Type** | Device Pairing Code | Sharing/Commissioner Code |
| **Checkbox** | Unchecked | ✅ Checked |
| **Result** | Exclusive control | Shared control |
| **Other Controllers** | Broken | Still work |
| **Complexity** | Simple | Slightly more complex |
| **Use Case** | New device | Adding to existing |

---

## Getting Help

If multi-admin commissioning isn't working:

1. ✅ **Check** you're using sharing code (not device code)
2. ✅ **Verify** "Multi-Admin Mode" is checked
3. ✅ **Test** device works in primary controller first
4. ✅ **Try** generating fresh sharing code
5. ✅ **Review** error messages in Node-RED logs

**Still stuck?**
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review logs for specific errors
- Test with initial commissioning first (factory reset)
- Open issue on GitHub with details

---

## Next Steps

1. **Try it**: Commission your Aqara device with multi-admin
2. **Test both**: Verify Aqara and Node-RED both work
3. **Build flows**: Create automations using both systems
4. **Monitor**: Watch how both controllers interact
5. **Share feedback**: Let us know how it works!

---

**Happy Multi-Admin Commissioning! 🎉**

*Your devices, multiple controllers, one seamless experience.*

