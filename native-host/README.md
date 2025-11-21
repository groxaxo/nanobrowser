# Nanobrowser Native Host for Computer Use

This native messaging host enables Nanobrowser to control your computer at the OS level, extending beyond browser automation to full desktop control.

## Overview

The native host is a Python application that communicates with the Nanobrowser Chrome extension via Chrome's native messaging protocol. It provides:

- **Desktop screenshot capture** (full screen, multi-monitor support)
- **Mouse control** (click, move, drag) at OS level
- **Keyboard control** (type text, press keys with modifiers)
- **Window management** (focus, minimize, maximize)
- **Cross-platform support** (Windows, Linux, macOS)

## Prerequisites

- Python 3.8 or higher
- pip package manager

## Installation

### Linux (Ubuntu/Debian)

```bash
# Install dependencies
pip install -r requirements.txt

# Run installation script
python install_native_host.py --platform linux
```

The installation script will:
1. Create a native messaging manifest file
2. Place it in `~/.config/google-chrome/NativeMessagingHosts/`
3. Make the host script executable

### Windows

```bash
# Install dependencies
pip install -r requirements.txt

# Run installation script (with admin privileges)
python install_native_host.py --platform windows
```

The installation script will:
1. Create a native messaging manifest file
2. Register it in the Windows Registry
3. Configure the host script path

### macOS

```bash
# Install dependencies
pip install -r requirements.txt

# Run installation script
python install_native_host.py --platform macos
```

The installation script will:
1. Create a native messaging manifest file
2. Place it in `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
3. Make the host script executable

## Testing

After installation, test the native host:

```bash
python test_native_host.py
```

This will:
1. Connect to the native host
2. Test screenshot capture
3. Test mouse movement
4. Test keyboard input
5. Report success or failure

## Security

The native host runs with the same privileges as your user account. It can:
- Capture screenshots of your entire desktop
- Control mouse and keyboard
- Access any window or application

**Important security notes:**
- Only install the native host if you trust Nanobrowser
- The host is sandboxed by Chrome's native messaging protocol
- All communication is local (no network access)
- The extension can only communicate with the installed host

## Troubleshooting

### "Native messaging host not found"

1. Verify the host is installed: Check for the manifest file in the correct location
2. Verify Python path in manifest is correct
3. Try reinstalling: `python install_native_host.py --platform <your-platform>`

### "Permission denied" on Linux/macOS

Make the host executable:
```bash
chmod +x computer_use_host.py
```

### Windows Registry issues

Run the installation script with administrator privileges:
```bash
# Right-click Command Prompt → Run as Administrator
python install_native_host.py --platform windows
```

## Architecture

```
┌─────────────────────────────────────┐
│   Nanobrowser Chrome Extension      │
│   (background/computer/native-*)    │
└──────────────┬──────────────────────┘
               │ Chrome Native Messaging
               │ (stdin/stdout JSON-RPC)
               ▼
┌─────────────────────────────────────┐
│   Native Host (Python)              │
│   - computer_use_host.py            │
│   - pyautogui (automation)          │
│   - pillow (screenshots)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Operating System                  │
│   - Display server (X11/Wayland)    │
│   - Input subsystem                 │
│   - Window manager                  │
└─────────────────────────────────────┘
```

## Development

To modify the native host:

1. Edit `computer_use_host.py`
2. Test your changes: `python computer_use_host.py --test`
3. Reload the extension in Chrome
4. Test with Nanobrowser

## Uninstallation

To remove the native host:

```bash
python install_native_host.py --uninstall --platform <your-platform>
```

This will remove the manifest file and registry entries.

## License

Apache License 2.0 - Same as Nanobrowser
