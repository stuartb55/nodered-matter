# Verification Checklist - node-red-contrib-matter

Use this checklist to verify that all fixes have been applied correctly and the system works as expected.

---

## 1. Code Changes Verification

### ✅ Check Fixed Files

#### nodes/matter-controller.js
- [ ] Line 9: `const fs = require("fs");` added
- [ ] Line 23: Changed from `console.log` to `node.log`
- [ ] Lines 29-39: Storage directory creation code added
- [ ] Lines 87-89: Pairing code logging is sanitized (no actual code logged)
- [ ] Lines 105-106: Only logs discriminator, not full commissioning data
- [ ] Line 135: Status is "red" on commission error (not green)
- [ ] Line 136: Uses `node.error()` not just throw
- [ ] Lines 238-269: Subscription returns unsubscribe handle
- [ ] Lines 303-331: HTTP endpoint has input validation
- [ ] Lines 342-352: Uses `RED.log.info` not `console.log`

#### nodes/matter-device.js
- [ ] Lines 22-24: Added `subscriptionHandle`, `retryCount`, `MAX_RETRIES`
- [ ] Lines 27-38: Wait loop has timeout (30 seconds)
- [ ] Line 78: Subscription handle is stored
- [ ] Line 104: Subscription handle set to null on error
- [ ] Lines 109-110: Added `errorCount` and `MAX_CONSECUTIVE_ERRORS`
- [ ] Lines 119-120: Error count reset on success
- [ ] Lines 139-157: Error recovery with retry logic
- [ ] Lines 182-213: Proper async close handler with timeout

#### package.json
- [ ] Line 5: No `"main": "index.js"` field (removed)

---

## 2. Functional Testing

### Test 1: Fresh Installation
```bash
# Install the package
cd ~/.node-red
npm install /path/to/node-red-contrib-matter

# Restart Node-RED
# Check the console/logs for:
```

**Expected Results:**
- [ ] No errors during npm install
- [ ] Nodes appear in Node-RED palette under "Matter" category
- [ ] No "Cannot find module" errors
- [ ] Storage directory `.node-red-matter` is created automatically

**Logs to Check:**
- [ ] "Creating controller node with ID: ..." (not console.log)
- [ ] "Created storage directory: ..." (on first run)
- [ ] No pairing codes visible in logs

---

### Test 2: Controller Configuration

**Steps:**
1. Drag "matter device" node to flow
2. Double-click to edit
3. Click pencil icon next to Controller
4. Enter name "Test Controller"
5. Click "Add"
6. Click "Deploy"
7. Wait 15 seconds
8. Reopen controller configuration

**Expected Results:**
- [ ] Controller shows "✓ Controller Ready" message
- [ ] "Commission Device" button is enabled
- [ ] No console.log messages in browser console
- [ ] Controller status shows green dot in Node-RED

---

### Test 3: Invalid Pairing Code

**Steps:**
1. Open controller configuration
2. Enter invalid code: "abc123"
3. Click "Commission Device"

**Expected Results:**
- [ ] Error message: "Invalid pairing code format"
- [ ] Details mention expected format
- [ ] Status remains green (controller still works)
- [ ] No crash or unhandled errors

---

### Test 4: Valid Device Commissioning

**Prerequisites:** Have a real Matter device in pairing mode with valid code

**Steps:**
1. Put device in pairing mode
2. Enter valid pairing code
3. Click "Commission Device"
4. Wait for completion

**Expected Results:**
- [ ] Status changes to yellow "commissioning..."
- [ ] Logs show code type (QR/Manual) but NOT actual code
- [ ] On success: Green status with success message
- [ ] Device appears in commissioned devices list
- [ ] Device gets a NodeId assigned

**On Error:**
- [ ] Status changes to RED "commission failed" (NOT green)
- [ ] Error message is clear and actionable
- [ ] Log shows sanitized error info

---

### Test 5: Device Node Initialization

**Steps:**
1. Add "matter device" node
2. Configure with commissioned device
3. Deploy

**Expected Results:**
- [ ] Node shows yellow "initializing" initially
- [ ] Changes to green "ready" within 30 seconds
- [ ] If controller not ready: Red "controller timeout" after 30 seconds
- [ ] No infinite waiting
- [ ] Clear error message if timeout occurs

---

### Test 6: Device State Updates

**Steps:**
1. Configure device node with "Output on state change" enabled
2. Connect to debug node
3. Deploy
4. Trigger physical device (open/close door sensor)

**Expected Results:**
- [ ] Messages appear in debug panel
- [ ] Message format is correct (payload, state, topic, device, timestamp)
- [ ] Status updates in real-time (open/closed)
- [ ] No duplicate messages
- [ ] No errors in logs

---

### Test 7: Manual Trigger

**Steps:**
1. Add inject node
2. Connect to device node input
3. Click inject

**Expected Results:**
- [ ] Device state is read immediately
- [ ] Message sent to output
- [ ] No errors even if rapid clicks

---

### Test 8: Error Recovery

**Steps:**
1. Commission device successfully
2. Move device out of range or power off
3. Wait for errors
4. Bring device back in range

**Expected Results:**
- [ ] Initial errors show retry count (retry 1, retry 2, etc.)
- [ ] After 5 errors: Status shows "device offline"
- [ ] Polling rate reduces automatically
- [ ] When device returns: Recovers automatically
- [ ] Error count resets on success

---

### Test 9: Node Deletion / Redeployment

**Steps:**
1. Delete device node
2. Redeploy
3. Check Node-RED logs

**Expected Results:**
- [ ] No errors in logs
- [ ] Subscriptions cleaned up (check logs)
- [ ] No "unhandled promise rejection" errors
- [ ] Memory stable (no leaks)

---

### Test 10: Node-RED Restart

**Steps:**
1. Commission device
2. Configure device node
3. Verify working
4. Restart Node-RED
5. Wait for initialization

**Expected Results:**
- [ ] Controller reconnects automatically
- [ ] Devices show as connected
- [ ] State updates resume
- [ ] No re-commissioning needed
- [ ] Storage directory preserved

---

### Test 11: Clean Shutdown

**Steps:**
1. Stop Node-RED gracefully (Ctrl+C or service stop)
2. Check logs during shutdown

**Expected Results:**
- [ ] "Matter Controller closed" message appears
- [ ] No timeout warnings
- [ ] No errors during shutdown
- [ ] Clean exit (no forced kill)

---

### Test 12: Multiple Devices

**Steps:**
1. Commission 2+ devices
2. Add device node for each
3. Deploy
4. Trigger devices

**Expected Results:**
- [ ] All devices work independently
- [ ] No cross-talk between devices
- [ ] Correct NodeId in each message
- [ ] No performance degradation

---

## 3. Security Verification

### Log Analysis
Review Node-RED logs for:
- [ ] No full pairing codes visible
- [ ] Only code type (QR/Manual) and length logged
- [ ] No commissioning data with sensitive info
- [ ] No passwords or credentials visible

### Storage Security
Check `.node-red-matter` directory:
- [ ] Directory has correct permissions (755)
- [ ] Files are created by correct user
- [ ] Data persists across restarts
- [ ] No world-readable sensitive data

---

## 4. Performance Testing

### Resource Usage
Monitor during operation:
- [ ] Memory usage stable (no growth over time)
- [ ] CPU usage reasonable (< 5% idle, < 20% active)
- [ ] No file handle leaks
- [ ] Network usage appropriate for Matter protocol

### Load Testing
With multiple devices:
- [ ] Rapid state changes handled
- [ ] No message loss
- [ ] No queue buildup
- [ ] Response times acceptable (< 1 second)

---

## 5. Edge Cases

### Test: Controller Not Deployed
**Steps:**
1. Create device node
2. Select controller
3. Don't deploy controller
4. Deploy device node

**Expected:**
- [ ] Times out after 30 seconds
- [ ] Clear error message
- [ ] Node shows red status

### Test: Deleted Controller
**Steps:**
1. Create and deploy device node
2. Delete controller config
3. Deploy

**Expected:**
- [ ] Node shows "no controller" status
- [ ] Error message is clear
- [ ] No crashes

### Test: Network Interruption
**Steps:**
1. Working device
2. Disconnect network briefly
3. Reconnect

**Expected:**
- [ ] Errors logged
- [ ] Reconnects automatically
- [ ] No manual intervention needed

---

## 6. Code Quality Checks

### Linting
```bash
# Run from project root
npm install  # if not done
# Check for any linter errors
```
- [ ] No linter errors
- [ ] No warnings (or all justified)

### Code Review Points
- [ ] No `console.log` statements
- [ ] All async functions have error handling
- [ ] All `close` handlers call `done()`
- [ ] All subscriptions have cleanup
- [ ] All timeouts are cleared

---

## 7. Documentation Verification

### README Accuracy
- [ ] Installation instructions work
- [ ] Example flow imports successfully
- [ ] Screenshots/descriptions match current UI
- [ ] Version numbers correct

### Help Text
In Node-RED:
- [ ] Controller help text accessible (click help icon)
- [ ] Device help text accessible
- [ ] Help text matches actual behavior
- [ ] Examples in help text work

---

## 8. Compatibility Testing

### Node.js Versions
Test with:
- [ ] Node.js 18.x (minimum)
- [ ] Node.js 20.x (LTS)
- [ ] Node.js 22.x (current)

### Node-RED Versions
Test with:
- [ ] Node-RED 2.0.x (minimum)
- [ ] Node-RED 3.x (current)
- [ ] Node-RED 4.x (if available)

### Operating Systems
Test on:
- [ ] Linux (Ubuntu/Debian)
- [ ] macOS
- [ ] Windows 10/11
- [ ] Docker container

---

## 9. Regression Testing

After any code changes, verify:
- [ ] All critical fixes still work
- [ ] No new bugs introduced
- [ ] Performance not degraded
- [ ] Documentation still accurate

---

## 10. Release Readiness

### Pre-Release Checklist
- [ ] All critical tests pass
- [ ] No known crashes
- [ ] Documentation complete
- [ ] Example flows work
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Git tags created

### Beta Release Criteria
- [ ] At least 2 device types tested
- [ ] No critical bugs in issue tracker
- [ ] Community feedback incorporated
- [ ] Known limitations documented

---

## Issue Reporting Template

If you find a bug, report with:

```markdown
### Bug Description
[Clear description of what went wrong]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Environment
- Node-RED version: 
- Node.js version: 
- OS: 
- Package version: 

### Logs
```
[Paste relevant logs]
```

### Additional Context
[Any other information]
```

---

## Summary Checklist

### Critical Functionality
- [ ] Controller initializes without errors
- [ ] Devices can be commissioned
- [ ] State updates are received
- [ ] Error handling works
- [ ] Clean shutdown
- [ ] No resource leaks

### Code Quality
- [ ] No linter errors
- [ ] All fixes applied
- [ ] Security hardened
- [ ] Logging consistent

### User Experience
- [ ] Clear status indicators
- [ ] Helpful error messages
- [ ] Documentation accurate
- [ ] Examples work

---

## Sign-off

When all tests pass:

```
✅ VERIFICATION COMPLETE

Tested by: ___________________
Date: _______________________
Environment: _________________
Result: PASS / FAIL
Notes: ______________________
```

---

**Last Updated:** October 12, 2025  
**Version:** 0.1.0 (Post-Fix)  
**Status:** Ready for verification

