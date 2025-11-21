/**
 * Browser-only computer provider
 * Uses Chrome extension APIs for browser automation (existing functionality)
 */

import { createLogger } from '@src/background/log';
import type {
  IComputerProvider,
  ComputerConfig,
  AnyComputerAction,
  ComputerActionResult,
  Point,
  ScreenSize,
  MouseButton,
  KeyModifier,
} from './types';
import { ComputerMode, ComputerActionType } from './types';

const logger = createLogger('BrowserProvider');

export class BrowserComputerProvider implements IComputerProvider {
  private config: ComputerConfig;
  private tabId: number | null = null;

  constructor(config?: Partial<ComputerConfig>) {
    this.config = {
      mode: ComputerMode.BROWSER_ONLY,
      sandbox: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing browser computer provider');
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      this.tabId = tab.id;
    }
  }

  async execute(action: AnyComputerAction): Promise<ComputerActionResult> {
    try {
      logger.debug('Executing action', { type: action.type });

      switch (action.type) {
        case ComputerActionType.SCREENSHOT:
          const screenshot = await this.screenshot(action.fullScreen);
          return { success: true, data: screenshot };

        case ComputerActionType.CLICK:
        case ComputerActionType.DOUBLE_CLICK:
        case ComputerActionType.RIGHT_CLICK:
          await this.click(action.coordinates, action.button, action.modifiers);
          return { success: true };

        case ComputerActionType.MOUSE_MOVE:
          await this.mouseMove(action.coordinates);
          return { success: true };

        case ComputerActionType.DRAG:
          await this.drag(action.from, action.to);
          return { success: true };

        case ComputerActionType.TYPE:
          await this.type(action.text, action.coordinates);
          return { success: true };

        case ComputerActionType.KEY_PRESS:
          await this.keyPress(action.keys, action.modifiers);
          return { success: true };

        case ComputerActionType.SCROLL:
          await this.scroll(action.deltaX, action.deltaY, action.coordinates);
          return { success: true };

        case ComputerActionType.WAIT:
          await this.wait(action.milliseconds);
          return { success: true };

        case ComputerActionType.GET_SCREEN_SIZE:
          const size = await this.getScreenSize();
          return { success: true, data: size };

        default:
          return { success: false, error: `Unknown action type: ${(action as any).type}` };
      }
    } catch (error) {
      logger.error('Action execution failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async screenshot(fullScreen?: boolean): Promise<string> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Capturing screenshot', { fullScreen });

    // Use chrome.tabs.captureVisibleTab for high-quality screenshots
    // Note: quality parameter only applies to 'jpeg' format, not 'png'
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'png',
    });

    // Convert data URL to base64 without the prefix
    return dataUrl ? dataUrl.split(',')[1] : '';
  }

  async getScreenSize(): Promise<ScreenSize> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    });

    if (!result.result) {
      throw new Error('Failed to get screen size');
    }

    return result.result;
  }

  async click(point: Point, button: MouseButton = 'left', modifiers: KeyModifier[] = []): Promise<void> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Clicking at coordinates', { point, button, modifiers });

    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (x: number, y: number, btn: MouseButton, mods: KeyModifier[]) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: btn === 'right' ? 2 : btn === 'middle' ? 1 : 0,
            ctrlKey: mods.includes('ctrl'),
            shiftKey: mods.includes('shift'),
            altKey: mods.includes('alt'),
            metaKey: mods.includes('meta'),
          });
          element.dispatchEvent(clickEvent);
        }
      },
      args: [point.x, point.y, button, modifiers],
    });
  }

  async mouseMove(point: Point): Promise<void> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Moving mouse to coordinates', { point });

    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (x: number, y: number) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const moveEvent = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          });
          element.dispatchEvent(moveEvent);

          // Also dispatch mouseenter and mouseover
          const enterEvent = new MouseEvent('mouseenter', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          });
          element.dispatchEvent(enterEvent);
        }
      },
      args: [point.x, point.y],
    });
  }

  async type(text: string, coordinates?: Point): Promise<void> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Typing text', { textLength: text.length, coordinates });

    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (textToType: string, coords?: { x: number; y: number }) => {
        let element: Element | null = null;

        // Focus at coordinates if provided
        if (coords) {
          element = document.elementFromPoint(coords.x, coords.y);
        } else {
          element = document.activeElement;
        }

        if (!element) {
          return;
        }

        // Focus the element
        if (element instanceof HTMLElement) {
          element.focus();
        }

        // Type the text
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = textToType;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (element instanceof HTMLElement && element.isContentEditable) {
          element.textContent = textToType;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      args: [text, coordinates],
    });
  }

  async keyPress(keys: string[], modifiers: KeyModifier[] = []): Promise<void> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Pressing keys', { keys, modifiers });

    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (keyList: string[], mods: KeyModifier[]) => {
        const element = document.activeElement || document.body;

        for (const key of keyList) {
          const keyEvent = new KeyboardEvent('keydown', {
            key: key,
            bubbles: true,
            cancelable: true,
            ctrlKey: mods.includes('ctrl'),
            shiftKey: mods.includes('shift'),
            altKey: mods.includes('alt'),
            metaKey: mods.includes('meta'),
          });
          element.dispatchEvent(keyEvent);

          // Also dispatch keyup
          const keyUpEvent = new KeyboardEvent('keyup', {
            key: key,
            bubbles: true,
            cancelable: true,
            ctrlKey: mods.includes('ctrl'),
            shiftKey: mods.includes('shift'),
            altKey: mods.includes('alt'),
            metaKey: mods.includes('meta'),
          });
          element.dispatchEvent(keyUpEvent);
        }
      },
      args: [keys, modifiers],
    });
  }

  async scroll(deltaX: number, deltaY: number, coordinates?: Point): Promise<void> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Scrolling', { deltaX, deltaY, coordinates });

    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (dx: number, dy: number, coords?: { x: number; y: number }) => {
        if (coords) {
          // Scroll specific element at coordinates
          const element = document.elementFromPoint(coords.x, coords.y);
          if (element) {
            element.scrollBy(dx, dy);
          }
        } else {
          // Scroll window
          window.scrollBy(dx, dy);
        }
      },
      args: [deltaX, deltaY, coordinates],
    });
  }

  async drag(from: Point, to: Point): Promise<void> {
    if (!this.tabId) {
      throw new Error('No active tab');
    }

    logger.info('Dragging', { from, to });

    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (fromX: number, fromY: number, toX: number, toY: number) => {
        const element = document.elementFromPoint(fromX, fromY);
        if (!element) {
          return;
        }

        // Mouse down
        const mouseDownEvent = new MouseEvent('mousedown', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: fromX,
          clientY: fromY,
        });
        element.dispatchEvent(mouseDownEvent);

        // Mouse move to target
        const mouseMoveEvent = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: toX,
          clientY: toY,
        });
        document.dispatchEvent(mouseMoveEvent);

        // Mouse up at target
        const mouseUpEvent = new MouseEvent('mouseup', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: toX,
          clientY: toY,
        });
        const targetElement = document.elementFromPoint(toX, toY);
        if (targetElement) {
          targetElement.dispatchEvent(mouseUpEvent);
        }

        // Dispatch dragend
        const dragEndEvent = new DragEvent('dragend', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: toX,
          clientY: toY,
        });
        element.dispatchEvent(dragEndEvent);
      },
      args: [from.x, from.y, to.x, to.y],
    });
  }

  async wait(milliseconds: number): Promise<void> {
    logger.debug('Waiting', { milliseconds });
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async dispose(): Promise<void> {
    logger.info('Disposing browser computer provider');
    this.tabId = null;
  }

  /**
   * Update the active tab ID
   */
  setTabId(tabId: number): void {
    this.tabId = tabId;
  }
}
