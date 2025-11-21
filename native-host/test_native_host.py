#!/usr/bin/env python3
"""
Test script for Nanobrowser Native Messaging Host
"""

import json
import struct
import sys
import subprocess
import time
from pathlib import Path


def send_message(process, message):
    """Send a message to the native host"""
    encoded_message = json.dumps(message).encode('utf-8')
    message_length = len(encoded_message)

    # Write message length (4 bytes)
    process.stdin.write(struct.pack('=I', message_length))

    # Write message content
    process.stdin.write(encoded_message)
    process.stdin.flush()


def read_message(process):
    """Read a message from the native host"""
    # Read message length (4 bytes)
    raw_length = process.stdout.read(4)
    if not raw_length:
        return None

    message_length = struct.unpack('=I', raw_length)[0]

    # Read message content
    message = process.stdout.read(message_length).decode('utf-8')
    return json.loads(message)


def test_native_host():
    """Test the native host"""
    print("🧪 Testing Nanobrowser Native Host\n")

    # Get host script path
    script_dir = Path(__file__).parent
    host_script = script_dir / "computer_use_host.py"

    if not host_script.exists():
        print(f"✗ Host script not found: {host_script}")
        return False

    # Start the native host
    print(f"▶ Starting native host: {host_script}")
    try:
        process = subprocess.Popen(
            ['python3', str(host_script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    except Exception as e:
        print(f"✗ Failed to start native host: {e}")
        return False

    time.sleep(0.5)

    try:
        # Test 1: Ping
        print("\n📡 Test 1: Ping")
        send_message(process, {'action': 'ping', 'id': 1})
        response = read_message(process)

        if response and response.get('success'):
            print(f"✓ Ping successful: {response.get('data')}")
        else:
            print(f"✗ Ping failed: {response}")
            return False

        # Test 2: Get screen size
        print("\n📐 Test 2: Get Screen Size")
        send_message(process, {'action': 'getScreenSize', 'id': 2})
        response = read_message(process)

        if response and response.get('success'):
            data = response.get('data', {})
            print(f"✓ Screen size: {data.get('width')}x{data.get('height')}")
        else:
            print(f"✗ Get screen size failed: {response}")
            return False

        # Test 3: Screenshot (don't actually save, just test the capability)
        print("\n📸 Test 3: Screenshot Capture")
        send_message(process, {'action': 'screenshot', 'id': 3, 'params': {'fullScreen': True}})
        response = read_message(process)

        if response and response.get('success'):
            data = response.get('data', {})
            screenshot_size = len(data.get('screenshot', ''))
            print(f"✓ Screenshot captured: {screenshot_size} bytes")
        else:
            print(f"✗ Screenshot failed: {response}")
            return False

        # Test 4: Mouse move (safe operation)
        print("\n🖱️  Test 4: Mouse Movement")
        send_message(process, {
            'action': 'mouseMove',
            'id': 4,
            'params': {'point': {'x': 100, 'y': 100}}
        })
        response = read_message(process)

        if response and response.get('success'):
            print("✓ Mouse move successful")
        else:
            print(f"⚠ Mouse move failed (may need permissions): {response}")

        print("\n✅ All tests completed!")
        return True

    except Exception as e:
        print(f"\n✗ Test failed with exception: {e}")
        return False

    finally:
        # Clean up
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()


def main():
    print("=" * 60)
    print(" Nanobrowser Native Host Test Suite")
    print("=" * 60)

    success = test_native_host()

    print("\n" + "=" * 60)
    if success:
        print("✅ Native host is working correctly!")
        print("\nYou can now use Desktop Mode in Nanobrowser.")
    else:
        print("✗ Native host test failed")
        print("\nTroubleshooting:")
        print("1. Make sure Python dependencies are installed:")
        print("   pip install -r requirements.txt")
        print("2. Check the log file: /tmp/nanobrowser_native_host.log")
        print("3. Verify the host is installed:")
        print("   python install_native_host.py --platform <your-platform>")

    print("=" * 60)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
