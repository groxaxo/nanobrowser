#!/usr/bin/env python3
"""
Installation script for Nanobrowser Native Messaging Host
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
from pathlib import Path


def get_extension_id():
    """Get the Chrome extension ID"""
    # Check environment variable first for development/testing
    env_id = os.environ.get('NANOBROWSER_EXTENSION_ID')
    if env_id:
        return env_id
    
    # For development, this can be the unpacked extension ID
    # For production, this should be the Chrome Web Store ID
    return "imbddededgmcgfhfpcjmijokokekbkal"  # Production ID from Chrome Web Store


def get_manifest_content(host_path: str, extension_id: str) -> dict:
    """Generate the native messaging manifest"""
    return {
        "name": "com.nanobrowser.computer_use_host",
        "description": "Nanobrowser Computer Use Native Host",
        "path": host_path,
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{extension_id}/"
        ]
    }


def install_linux(host_path: str, extension_id: str, uninstall: bool = False):
    """Install native host on Linux"""
    manifest_dir = Path.home() / ".config/google-chrome/NativeMessagingHosts"
    manifest_path = manifest_dir / "com.nanobrowser.computer_use_host.json"

    if uninstall:
        if manifest_path.exists():
            manifest_path.unlink()
            print(f"✓ Removed manifest: {manifest_path}")
        else:
            print("✗ Manifest not found")
        return

    # Create directory if needed
    manifest_dir.mkdir(parents=True, exist_ok=True)

    # Make host script executable
    os.chmod(host_path, 0o755)

    # Write manifest
    manifest = get_manifest_content(host_path, extension_id)
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"✓ Installed native host for Linux")
    print(f"  Manifest: {manifest_path}")
    print(f"  Host: {host_path}")

    # Check for X11 dependencies
    try:
        import Xlib
        print("✓ python3-xlib is installed")
    except ImportError:
        print("⚠ python3-xlib not found. Install with:")
        print("  sudo apt-get install python3-xlib")


def install_windows(host_path: str, extension_id: str, uninstall: bool = False):
    """Install native host on Windows"""
    import winreg

    registry_path = r"Software\Google\Chrome\NativeMessagingHosts\com.nanobrowser.computer_use_host"

    if uninstall:
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, registry_path)
            print(f"✓ Removed registry key: {registry_path}")
        except FileNotFoundError:
            print("✗ Registry key not found")
        return

    # Create manifest directory
    manifest_dir = Path.home() / "AppData/Local/Nanobrowser/NativeMessagingHosts"
    manifest_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = manifest_dir / "com.nanobrowser.computer_use_host.json"

    # Write manifest
    manifest = get_manifest_content(host_path, extension_id)
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Register in Windows Registry
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, registry_path)
        winreg.SetValue(key, "", winreg.REG_SZ, str(manifest_path))
        winreg.CloseKey(key)

        print(f"✓ Installed native host for Windows")
        print(f"  Manifest: {manifest_path}")
        print(f"  Host: {host_path}")
        print(f"  Registry: HKEY_CURRENT_USER\\{registry_path}")
    except Exception as e:
        print(f"✗ Failed to register in Windows Registry: {e}")
        print("  Try running this script as Administrator")


def install_macos(host_path: str, extension_id: str, uninstall: bool = False):
    """Install native host on macOS"""
    manifest_dir = Path.home() / "Library/Application Support/Google/Chrome/NativeMessagingHosts"
    manifest_path = manifest_dir / "com.nanobrowser.computer_use_host.json"

    if uninstall:
        if manifest_path.exists():
            manifest_path.unlink()
            print(f"✓ Removed manifest: {manifest_path}")
        else:
            print("✗ Manifest not found")
        return

    # Create directory if needed
    manifest_dir.mkdir(parents=True, exist_ok=True)

    # Make host script executable
    os.chmod(host_path, 0o755)

    # Write manifest
    manifest = get_manifest_content(host_path, extension_id)
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"✓ Installed native host for macOS")
    print(f"  Manifest: {manifest_path}")
    print(f"  Host: {host_path}")


def main():
    parser = argparse.ArgumentParser(description='Install Nanobrowser Native Messaging Host')
    parser.add_argument('--platform', choices=['linux', 'windows', 'macos'],
                        help='Target platform (auto-detected if not specified)')
    parser.add_argument('--uninstall', action='store_true',
                        help='Uninstall the native host')
    parser.add_argument('--extension-id', default=None,
                        help='Chrome extension ID (defaults to production ID)')

    args = parser.parse_args()

    # Auto-detect platform if not specified
    if not args.platform:
        if sys.platform.startswith('linux'):
            args.platform = 'linux'
        elif sys.platform == 'win32':
            args.platform = 'windows'
        elif sys.platform == 'darwin':
            args.platform = 'macos'
        else:
            print(f"✗ Unsupported platform: {sys.platform}")
            sys.exit(1)

    print(f"Platform: {args.platform}")

    # Get host script path
    script_dir = Path(__file__).parent.absolute()
    host_script = script_dir / "computer_use_host.py"

    if not host_script.exists():
        print(f"✗ Host script not found: {host_script}")
        sys.exit(1)

    # Get extension ID
    extension_id = args.extension_id or get_extension_id()

    # Install based on platform
    if args.platform == 'linux':
        install_linux(str(host_script), extension_id, args.uninstall)
    elif args.platform == 'windows':
        install_windows(str(host_script), extension_id, args.uninstall)
    elif args.platform == 'macos':
        install_macos(str(host_script), extension_id, args.uninstall)

    if not args.uninstall:
        print("\n📋 Next steps:")
        print("1. Install Python dependencies: pip install -r requirements.txt")
        print("2. Restart Chrome")
        print("3. Open Nanobrowser settings and enable 'Desktop Mode'")
        print("4. Test with: python test_native_host.py")


if __name__ == '__main__':
    main()
