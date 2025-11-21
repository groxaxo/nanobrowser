# CUA Desktop Mode - Quick Start Guide

Get started with Nanobrowser's Desktop Mode in 5 minutes!

## What is Desktop Mode?

Desktop Mode extends Nanobrowser beyond browser automation to control your entire computer. You can:
- Automate any desktop application (not just browsers)
- Control mouse and keyboard at the OS level
- Capture full-screen screenshots
- Create cross-application workflows

## Quick Setup

### Step 1: Check Requirements

✅ Python 3.8 or higher installed
✅ Nanobrowser extension installed
✅ 5 minutes of your time

### Step 2: Install Native Host

Open a terminal and run:

```bash
# Navigate to Nanobrowser directory
cd /path/to/nanobrowser

# Install Python dependencies
cd native-host
pip install -r requirements.txt

# Install native host (choose your platform)
python install_native_host.py --platform linux    # For Linux
python install_native_host.py --platform windows  # For Windows
python install_native_host.py --platform macos    # For macOS
```

### Step 3: Test Installation

```bash
python test_native_host.py
```

You should see:
```
✅ All tests completed!
```

### Step 4: Enable in Nanobrowser

1. Open Chrome and click the Nanobrowser icon
2. Click the ⚙️ Settings icon (top right)
3. Scroll to "General Settings"
4. Change "Computer Mode" to **Desktop** or **Hybrid**
5. Check ✅ "Enable Native Messaging"
6. Click "Save"
7. Restart Chrome

### Step 5: Test Desktop Mode

Try these commands:

**Test 1: Screen Info**
```
What is my screen resolution?
```

**Test 2: Desktop Screenshot**
```
Take a screenshot of my desktop and describe what you see
```

**Test 3: Application Control**
```
Open Notepad and type "Hello from Nanobrowser"
```

## Troubleshooting

### "Native messaging host not found"

1. Make sure you ran the installation script
2. Restart Chrome completely (not just reload)
3. Check that the manifest file exists:
   - **Linux**: `~/.config/google-chrome/NativeMessagingHosts/com.nanobrowser.computer_use_host.json`
   - **Windows**: Check Registry under `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\`
   - **macOS**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nanobrowser.computer_use_host.json`

### "Permission denied" (Linux/macOS)

```bash
chmod +x native-host/computer_use_host.py
```

### Python not found

Make sure Python 3.8+ is in your PATH:
```bash
python --version  # Should show 3.8 or higher
```

## What's Next?

### Learn More
- Read the full [CUA Integration Guide](CUA-INTEGRATION.md)
- Check the [Native Host README](native-host/README.md)
- Join our [Discord](https://discord.gg/NN3ABHggMK) for help

### Try More Examples

**System Information**
```
What processes are using the most memory on my system?
```

**File Management**
```
Find all files modified today in my Documents folder
```

**Multi-App Workflow**
```
Take the data from this spreadsheet and email it to myself
```

**Productivity**
```
Create a new folder on my desktop named "Project-[today's date]"
```

## Safety Tips

- ⚠️ Review complex commands before executing
- ⚠️ Test new workflows in a safe environment
- ⚠️ The agent can control your mouse/keyboard - stay nearby
- ⚠️ Use browser-only mode when desktop access isn't needed

## Need Help?

- 💬 [Discord Community](https://discord.gg/NN3ABHggMK)
- 🐛 [Report Issues](https://github.com/nanobrowser/nanobrowser/issues)
- 📖 [Full Documentation](CUA-INTEGRATION.md)

Happy automating! 🚀
