# Installation Instructions

## 🐳 Docker Installation

**If you're running Node-RED in Docker, see [DOCKER_INSTALL.md](DOCKER_INSTALL.md) for complete Docker-specific instructions.**

Quick Docker install:
```powershell
# Copy plugin to container (replace 'nodered' with your container name)
docker cp C:\Users\stuar\Cursor\noderedmatter nodered:/data/node-red-contrib-matter

# Install it
docker exec nodered sh -c "cd /data && npm install ./node-red-contrib-matter"

# Restart
docker restart nodered
```

---

## Method 1: Install from Local Directory (Recommended for Development)

Since you have the source code locally, you can install it directly into Node-RED:

### Windows (PowerShell)

```powershell
# Navigate to your Node-RED directory
cd $env:USERPROFILE\.node-red

# Install from local path
npm install C:\Users\stuar\Cursor\noderedmatter

# Restart Node-RED
```

### Linux/Mac (Bash)

```bash
# Navigate to your Node-RED directory
cd ~/.node-red

# Install from local path
npm install /path/to/noderedmatter

# Restart Node-RED
```

## Method 2: Link for Development

If you're actively developing the plugin:

### Windows (PowerShell)

```powershell
# In the plugin directory
cd C:\Users\stuar\Cursor\noderedmatter
npm link

# In Node-RED directory
cd $env:USERPROFILE\.node-red
npm link node-red-contrib-matter

# Restart Node-RED
```

### Linux/Mac (Bash)

```bash
# In the plugin directory
cd /path/to/noderedmatter
npm link

# In Node-RED directory
cd ~/.node-red
npm link node-red-contrib-matter

# Restart Node-RED
```

## Method 3: Copy to Node-RED node_modules (Quick Test)

### Windows (PowerShell)

```powershell
# Copy the entire directory
Copy-Item -Path "C:\Users\stuar\Cursor\noderedmatter" -Destination "$env:USERPROFILE\.node-red\node_modules\node-red-contrib-matter" -Recurse -Force

# Restart Node-RED
```

### Linux/Mac (Bash)

```bash
# Copy the entire directory
cp -r /path/to/noderedmatter ~/.node-red/node_modules/node-red-contrib-matter

# Restart Node-RED
```

## Verify Installation

After installation and restart, verify the nodes appear:

1. Open Node-RED in your browser
2. Look for "Matter" category in the palette (left sidebar)
3. You should see:
   - **matter device** - Input node for device states
   - **matter controller** - Configuration node (in config nodes)

## Troubleshooting Installation

### Nodes don't appear
- Ensure Node-RED was completely restarted
- Check for errors in Node-RED startup logs
- Verify installation: `npm list node-red-contrib-matter` in `~/.node-red`

### Module not found errors
- Run `npm install` in the plugin directory first
- Ensure all dependencies are installed
- Check Node.js version: `node --version` (should be 18+)

### Permission errors (Linux/Mac)
- Don't use `sudo` with npm in Node-RED directory
- Check file ownership: `ls -la ~/.node-red/node_modules`
- Fix permissions: `chown -R $USER:$USER ~/.node-red`

## After Installation

Once installed successfully:

1. **Configure Controller**: See `QUICKSTART.md`
2. **Commission Device**: See `SETUP.md`
3. **Import Example**: Import `examples/contact-sensor-flow.json`
4. **Read Docs**: Check `README.md` for full documentation

## Updating

To update after making changes:

### If using npm install (Method 1):
```bash
cd ~/.node-red
npm update node-red-contrib-matter
# Restart Node-RED
```

### If using npm link (Method 2):
- Changes are automatically reflected
- Just restart Node-RED

### If using copy (Method 3):
- Delete the old directory
- Copy again with updated files
- Restart Node-RED

## Uninstalling

To remove the plugin:

```bash
cd ~/.node-red
npm uninstall node-red-contrib-matter
# Restart Node-RED
```

**Note**: Commissioned device data in `~/.node-red/.node-red-matter/` will remain. Delete this directory manually if you want to remove all device pairings.

## Next Steps

After successful installation:
- 📖 Read `QUICKSTART.md` for 5-minute setup
- 🔧 Read `USAGE_NOTES.md` for door sensor specifics  
- 📚 Read `SETUP.md` for detailed setup
- 📘 Read `README.md` for complete documentation

Happy automating! 🏠

