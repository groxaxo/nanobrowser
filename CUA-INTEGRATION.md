# Computer-Using Agent (CUA) Integration Guide

This guide explains how Nanobrowser integrates Computer-Using Agent (CUA) technology inspired by [CUA.ai](https://cua.ai/docs/) to provide both browser and desktop automation capabilities.

## Overview

Nanobrowser now supports three operation modes:

1. **Browser-Only Mode** (Default) - Traditional browser automation using Chrome APIs
2. **Desktop Mode** - Full OS-level control using native messaging
3. **Hybrid Mode** - Automatically uses desktop mode when available, falls back to browser mode

## Architecture

### Browser-Only Mode (Default)

```
┌─────────────────────────┐
│  Chrome Extension       │
│  ├─ BrowserProvider     │
│  └─ Chrome APIs         │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Browser Automation     │
│  - Tab control          │
│  - DOM manipulation     │
│  - Event injection      │
└─────────────────────────┘
```

**Capabilities:**
- Web page navigation
- Click, type, scroll within browser
- Form filling and submission
- JavaScript execution
- Screenshot capture (viewport)

**Limitations:**
- Cannot control desktop applications
- Limited to browser viewport
- No cross-application workflows

### Desktop Mode (with Native Host)

```
┌─────────────────────────────────┐
│  Chrome Extension               │
│  ├─ NativeProvider              │
│  └─ Native Messaging Protocol   │
└──────────────┬──────────────────┘
               │ Chrome Native Messaging
               │ (stdin/stdout JSON-RPC)
               ▼
┌─────────────────────────────────┐
│  Native Host (Python)           │
│  ├─ computer_use_host.py        │
│  ├─ PyAutoGUI                   │
│  └─ PIL/Pillow                  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Operating System               │
│  ├─ Display Server (X11/Win32)  │
│  ├─ Input Subsystem             │
│  └─ Window Manager              │
└─────────────────────────────────┘
```

**Capabilities:**
- Full desktop screenshots
- Control any desktop application
- Multi-monitor support
- Cross-application workflows
- Native OS interactions
- File manager operations
- System tray interactions

**Requirements:**
- Python 3.8+
- Native host installation
- OS-specific permissions

## Installation

### 1. Install Native Host

#### Linux (Ubuntu/Debian)
```bash
cd native-host
pip install -r requirements.txt
sudo apt-get install python3-xlib  # X11 support
python install_native_host.py --platform linux
```

#### Windows
```bash
cd native-host
pip install -r requirements.txt
python install_native_host.py --platform windows
```
*Note: May require administrator privileges*

#### macOS
```bash
cd native-host
pip install -r requirements.txt
python install_native_host.py --platform macos
```

### 2. Test Installation

```bash
cd native-host
python test_native_host.py
```

Expected output:
```
🧪 Testing Nanobrowser Native Host

📡 Test 1: Ping
✓ Ping successful: pong

📐 Test 2: Get Screen Size
✓ Screen size: 1920x1080

📸 Test 3: Screenshot Capture
✓ Screenshot captured: 12345 bytes

🖱️  Test 4: Mouse Movement
✓ Mouse move successful

✅ All tests completed!
```

### 3. Enable in Nanobrowser

1. Open Nanobrowser settings
2. Navigate to "General Settings"
3. Set "Computer Mode" to one of:
   - **Browser Only**: Traditional browser automation (default)
   - **Desktop**: Full desktop control (requires native host)
   - **Hybrid**: Auto-detect best available mode
4. Enable "Native Messaging" checkbox
5. Restart Chrome

## Usage Examples

### Browser-Only Mode Examples

```javascript
// Simple browser automation
"Go to GitHub and find the trending Python repositories"
"Fill out the contact form on example.com with my details"
"Extract all product prices from this e-commerce page"
```

### Desktop Mode Examples

```javascript
// Desktop automation
"Take a screenshot of my entire desktop"
"Open VS Code and create a new file named today's-notes.md"
"Find all PDF files in my Downloads folder"

// Cross-application workflows
"Copy the table from this spreadsheet and paste it into my email client"
"Take data from this browser page and save it to a text file on desktop"
"Open Calculator app and compute 15% of 250"

// System interactions
"Check my system notifications"
"Open file manager and navigate to Documents folder"
"Adjust screen brightness to 50%"
```

### Hybrid Mode Examples

```javascript
// Automatically uses best available mode
"Search for 'Python tutorials' and open the first result"
// → Uses browser mode (webpage interaction)

"Open a text editor and write a todo list"
// → Uses desktop mode (desktop app interaction)

"Download this file and move it to my Projects folder"
// → Uses both modes (download in browser, file move in desktop)
```

## Computer Action Types

The computer interface supports these action types:

### Basic Actions
- `screenshot` - Capture full screen or viewport
- `click` - Click at specific coordinates
- `double_click` - Double-click at coordinates
- `right_click` - Right-click for context menu
- `mouse_move` - Move cursor to coordinates
- `drag` - Drag from one point to another

### Input Actions
- `type` - Type text (with optional focus coordinates)
- `key_press` - Press keys with modifiers (Ctrl, Shift, Alt, Meta)
- `scroll` - Scroll at specific coordinates or window

### Utility Actions
- `wait` - Wait for specified milliseconds
- `get_screen_size` - Get display dimensions

## Configuration

### Storage Settings

```typescript
interface GeneralSettingsConfig {
  // ... existing settings ...
  computerMode: 'browser_only' | 'desktop' | 'hybrid';
  enableNativeMessaging: boolean;
}
```

### Programmatic Usage

```typescript
import { ComputerProviderFactory, ComputerMode } from '@src/background/computer';

// Create a computer provider
const provider = await ComputerProviderFactory.create({
  mode: ComputerMode.DESKTOP,
  enableNativeMessaging: true,
  sandbox: true,
});

// Initialize
await provider.initialize();

// Capture screenshot
const screenshot = await provider.screenshot(true);

// Click at coordinates
await provider.click({ x: 500, y: 300 });

// Type text
await provider.type("Hello, World!");

// Cleanup
await provider.dispose();
```

## Security Considerations

### Permissions

The native host requires:
- **Read**: Screen content, window information
- **Write**: Keyboard input, mouse input
- **Execute**: Application launching (indirect)

### Sandboxing

1. **Extension Side**: Chrome's extension sandbox
2. **Native Host**: Runs with user privileges (not elevated)
3. **Communication**: Local only (no network access)
4. **Isolation**: Cannot access browser's internal state

### Best Practices

1. **Review Actions**: Always review what actions the agent will perform
2. **Test Safely**: Use test environments for complex workflows
3. **Monitor Logs**: Check `/tmp/nanobrowser_native_host.log` on Linux/macOS
4. **Limit Scope**: Use browser-only mode when desktop access isn't needed
5. **Regular Updates**: Keep native host and dependencies updated

## Troubleshooting

### Native Host Not Found

**Symptom**: "Native messaging host not available" error

**Solutions**:
1. Verify installation: `python test_native_host.py`
2. Check manifest location:
   - Linux: `~/.config/google-chrome/NativeMessagingHosts/`
   - Windows: Check registry `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\`
   - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
3. Verify Python path in manifest file
4. Reinstall: `python install_native_host.py --platform <platform>`

### Permission Issues (Linux)

**Symptom**: Mouse/keyboard control not working

**Solutions**:
1. Install X11 library: `sudo apt-get install python3-xlib`
2. Check display permissions
3. Try with X11 instead of Wayland

### Windows Registry Issues

**Symptom**: Installation fails on Windows

**Solutions**:
1. Run installation as Administrator
2. Manually verify registry key exists
3. Check Windows Defender/antivirus isn't blocking

### macOS Accessibility

**Symptom**: Actions fail silently on macOS

**Solutions**:
1. Grant accessibility permissions to Terminal/Python
2. System Preferences → Security & Privacy → Accessibility
3. Add Python and Terminal to allowed apps

## Comparison with CUA.ai

| Feature | Nanobrowser CUA | CUA.ai | OpenAI CUA |
|---------|----------------|---------|------------|
| **Architecture** | Chrome Extension + Native Host | Standalone Framework | Cloud Service |
| **Browser Automation** | ✅ Chrome/Edge | ✅ Any browser | ✅ Web-based |
| **Desktop Automation** | ✅ Windows/Linux/macOS | ✅ Any OS | ❌ Limited |
| **Model Support** | OpenAI, Anthropic, Gemini, etc. | 100+ models via LiteLLM | GPT-4o only |
| **Privacy** | Local execution | Local/cloud options | Cloud only |
| **Cost** | Free (use your API keys) | Free (open source) | $200/month |
| **Installation** | Extension + Python host | Python package | N/A (SaaS) |
| **Integration** | Browser-first + desktop | Desktop-first | Browser-only |

## Advanced Usage

### Custom Computer Provider

You can implement a custom computer provider for specialized hardware or environments:

```typescript
import { IComputerProvider } from '@src/background/computer';

class CustomProvider implements IComputerProvider {
  async initialize(): Promise<void> {
    // Your initialization code
  }

  async screenshot(fullScreen?: boolean): Promise<string> {
    // Custom screenshot implementation
  }

  // Implement other methods...
}
```

### Vision-First Automation

Combine with Nanobrowser's existing vision system:

```typescript
import { VisionService } from '@src/background/vision';
import { ComputerProviderFactory } from '@src/background/computer';

// Capture screenshot
const provider = await ComputerProviderFactory.create({ mode: 'desktop' });
const screenshot = await provider.screenshot(true);

// Analyze with vision model
const visionService = new VisionService({ provider: 'huggingface' });
const analysis = await visionService.callVisionModel(
  screenshot,
  "What buttons are visible on the screen?"
);

// Parse grounding format and click
// <box>(100,50),(250,90)</box>
const coordinates = parseGroundingBox(analysis);
await provider.click({ x: coordinates.centerX, y: coordinates.centerY });
```

## Roadmap

Future enhancements planned:

- [ ] Multi-monitor screenshot stitching
- [ ] OCR integration for text extraction
- [ ] Window management (focus, minimize, maximize)
- [ ] Clipboard operations
- [ ] File system operations
- [ ] Process management
- [ ] System information gathering
- [ ] Network status monitoring
- [ ] Docker container support
- [ ] VM integration

## Contributing

We welcome contributions to improve CUA integration:

1. **Report Issues**: Native host bugs or platform-specific issues
2. **Test Platforms**: Help test on different OS versions
3. **Add Features**: Implement new computer actions
4. **Documentation**: Improve guides and examples
5. **Examples**: Share interesting automation workflows

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0 - Same as Nanobrowser

## Acknowledgments

- [CUA.ai](https://cua.ai/) - Inspiration for computer-using agent architecture
- [PyAutoGUI](https://pyautogui.readthedocs.io/) - Cross-platform desktop automation
- [OpenAI Computer Use](https://platform.openai.com/docs/guides/tools-computer-use) - API design patterns
- [Browser Use](https://github.com/browser-use/browser-use) - Browser automation concepts

## Support

- [Discord](https://discord.gg/NN3ABHggMK) - Community chat
- [GitHub Issues](https://github.com/nanobrowser/nanobrowser/issues) - Bug reports
- [Discussions](https://github.com/nanobrowser/nanobrowser/discussions) - Questions and ideas
