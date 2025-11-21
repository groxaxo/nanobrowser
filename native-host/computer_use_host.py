#!/usr/bin/env python3
"""
Nanobrowser Native Messaging Host for Computer Use
Enables OS-level computer control for Nanobrowser extension
"""

import sys
import json
import struct
import logging
import base64
import io
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    filename='/tmp/nanobrowser_native_host.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Import automation libraries
try:
    import pyautogui
    import PIL.Image
    AUTOMATION_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import automation libraries: {e}")
    AUTOMATION_AVAILABLE = False


class NativeHost:
    """Native messaging host for computer control"""

    def __init__(self):
        self.running = True
        logger.info("Native host initialized")

    def read_message(self) -> Optional[Dict[str, Any]]:
        """Read a message from stdin"""
        try:
            # Read message length (4 bytes)
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length:
                return None

            message_length = struct.unpack('=I', raw_length)[0]

            # Read message content
            message = sys.stdin.buffer.read(message_length).decode('utf-8')
            return json.loads(message)
        except Exception as e:
            logger.error(f"Failed to read message: {e}")
            return None

    def send_message(self, message: Dict[str, Any]):
        """Send a message to stdout"""
        try:
            encoded_message = json.dumps(message).encode('utf-8')
            message_length = len(encoded_message)

            # Write message length (4 bytes)
            sys.stdout.buffer.write(struct.pack('=I', message_length))

            # Write message content
            sys.stdout.buffer.write(encoded_message)
            sys.stdout.buffer.flush()

            logger.debug(f"Sent message: {message.get('action', 'unknown')}")
        except Exception as e:
            logger.error(f"Failed to send message: {e}")

    def handle_message(self, message: Dict[str, Any]):
        """Handle incoming message and send response"""
        try:
            action = message.get('action')
            message_id = message.get('id')
            params = message.get('params', {})

            logger.info(f"Handling action: {action}")

            if not AUTOMATION_AVAILABLE:
                self.send_error_response(message_id, "Automation libraries not available")
                return

            # Route to appropriate handler
            if action == 'ping':
                response = {'success': True, 'data': 'pong'}
            elif action == 'screenshot':
                response = self.handle_screenshot(params)
            elif action == 'getScreenSize':
                response = self.handle_get_screen_size()
            elif action == 'click':
                response = self.handle_click(params)
            elif action == 'mouseMove':
                response = self.handle_mouse_move(params)
            elif action == 'type':
                response = self.handle_type(params)
            elif action == 'keyPress':
                response = self.handle_key_press(params)
            elif action == 'scroll':
                response = self.handle_scroll(params)
            elif action == 'drag':
                response = self.handle_drag(params)
            elif action == 'execute':
                response = self.handle_execute(params)
            else:
                response = {'success': False, 'error': f'Unknown action: {action}'}

            # Add message ID to response
            if message_id is not None:
                response['id'] = message_id

            self.send_message(response)

        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            self.send_error_response(message.get('id'), str(e))

    def send_error_response(self, message_id: Optional[int], error: str):
        """Send error response"""
        response = {'success': False, 'error': error}
        if message_id is not None:
            response['id'] = message_id
        self.send_message(response)

    def handle_screenshot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Capture screenshot"""
        try:
            full_screen = params.get('fullScreen', True)

            # Capture screenshot
            screenshot = pyautogui.screenshot()

            # Convert to base64
            buffer = io.BytesIO()
            screenshot.save(buffer, format='PNG')
            screenshot_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            logger.info(f"Screenshot captured: {screenshot.size}")

            return {
                'success': True,
                'data': {
                    'screenshot': screenshot_base64,
                    'width': screenshot.width,
                    'height': screenshot.height
                }
            }
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return {'success': False, 'error': str(e)}

    def handle_get_screen_size(self) -> Dict[str, Any]:
        """Get screen dimensions"""
        try:
            size = pyautogui.size()
            return {
                'success': True,
                'data': {
                    'width': size.width,
                    'height': size.height
                }
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def handle_click(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mouse click"""
        try:
            point = params.get('point', {})
            x, y = point.get('x'), point.get('y')
            button = params.get('button', 'left')
            modifiers = params.get('modifiers', [])

            # Apply modifiers
            for modifier in modifiers:
                pyautogui.keyDown(modifier)

            # Click
            pyautogui.click(x, y, button=button)

            # Release modifiers
            for modifier in reversed(modifiers):
                pyautogui.keyUp(modifier)

            logger.info(f"Clicked at ({x}, {y}) with {button} button")
            return {'success': True}
        except Exception as e:
            logger.error(f"Click failed: {e}")
            return {'success': False, 'error': str(e)}

    def handle_mouse_move(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mouse movement"""
        try:
            point = params.get('point', {})
            x, y = point.get('x'), point.get('y')

            pyautogui.moveTo(x, y)

            logger.info(f"Moved mouse to ({x}, {y})")
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def handle_type(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle typing text"""
        try:
            text = params.get('text', '')
            coordinates = params.get('coordinates')

            # Click at coordinates if provided
            if coordinates:
                x, y = coordinates.get('x'), coordinates.get('y')
                pyautogui.click(x, y)

            # Type text
            pyautogui.typewrite(text, interval=0.05)

            logger.info(f"Typed {len(text)} characters")
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def handle_key_press(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle key press with modifiers"""
        try:
            keys = params.get('keys', [])
            modifiers = params.get('modifiers', [])

            # Press modifiers
            for modifier in modifiers:
                pyautogui.keyDown(modifier)

            # Press keys
            for key in keys:
                pyautogui.press(key)

            # Release modifiers
            for modifier in reversed(modifiers):
                pyautogui.keyUp(modifier)

            logger.info(f"Pressed keys: {keys} with modifiers: {modifiers}")
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def handle_scroll(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle scrolling"""
        try:
            delta_x = params.get('deltaX', 0)
            delta_y = params.get('deltaY', 0)
            coordinates = params.get('coordinates')

            # Move to coordinates if provided
            if coordinates:
                x, y = coordinates.get('x'), coordinates.get('y')
                pyautogui.moveTo(x, y)

            # Scroll
            if delta_y != 0:
                pyautogui.scroll(-delta_y)  # PyAutoGUI uses inverted scroll

            logger.info(f"Scrolled by ({delta_x}, {delta_y})")
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def handle_drag(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle drag operation"""
        try:
            from_point = params.get('from', {})
            to_point = params.get('to', {})

            from_x, from_y = from_point.get('x'), from_point.get('y')
            to_x, to_y = to_point.get('x'), to_point.get('y')

            # Drag from one point to another
            pyautogui.moveTo(from_x, from_y)
            pyautogui.dragTo(to_x, to_y, duration=0.5)

            logger.info(f"Dragged from ({from_x}, {from_y}) to ({to_x}, {to_y})")
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def handle_execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a computer action"""
        try:
            action_type = params.get('type')

            # Route to appropriate handler based on action type
            if action_type == 'screenshot':
                return self.handle_screenshot(params)
            elif action_type in ['click', 'double_click', 'right_click']:
                return self.handle_click(params)
            elif action_type == 'mouse_move':
                return self.handle_mouse_move(params)
            elif action_type == 'type':
                return self.handle_type(params)
            elif action_type == 'key_press':
                return self.handle_key_press(params)
            elif action_type == 'scroll':
                return self.handle_scroll(params)
            elif action_type == 'drag':
                return self.handle_drag(params)
            elif action_type == 'wait':
                import time
                time.sleep(params.get('milliseconds', 0) / 1000.0)
                return {'success': True}
            elif action_type == 'get_screen_size':
                return self.handle_get_screen_size()
            else:
                return {'success': False, 'error': f'Unknown action type: {action_type}'}

        except Exception as e:
            logger.error(f"Execute failed: {e}")
            return {'success': False, 'error': str(e)}

    def run(self):
        """Main message loop"""
        logger.info("Native host starting")

        try:
            while self.running:
                message = self.read_message()

                if message is None:
                    logger.info("No more messages, exiting")
                    break

                self.handle_message(message)

        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)
        finally:
            logger.info("Native host shutting down")


def main():
    """Entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        print("Testing native host...")
        print(f"PyAutoGUI available: {AUTOMATION_AVAILABLE}")
        if AUTOMATION_AVAILABLE:
            size = pyautogui.size()
            print(f"Screen size: {size.width}x{size.height}")
        sys.exit(0)

    host = NativeHost()
    host.run()


if __name__ == '__main__':
    main()
