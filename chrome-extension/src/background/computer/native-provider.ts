/**
 * Native computer provider for OS-level automation
 * Uses Chrome native messaging to communicate with a native host application
 * that can control the desktop (Windows, Linux, macOS)
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
import { ComputerMode } from './types';

const logger = createLogger('NativeProvider');

// Native messaging host name (must match the native host manifest)
const NATIVE_HOST_NAME = 'com.nanobrowser.computer_use_host';

interface NativeMessage {
  action: string;
  params?: any;
}

interface NativeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class NativeComputerProvider implements IComputerProvider {
  private config: ComputerConfig;
  private port: chrome.runtime.Port | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();

  constructor(config?: Partial<ComputerConfig>) {
    this.config = {
      mode: ComputerMode.DESKTOP,
      enableNativeMessaging: true,
      sandbox: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing native computer provider');

    try {
      // Connect to native messaging host
      this.port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

      // Handle messages from native host
      this.port.onMessage.addListener(message => {
        this.handleNativeMessage(message);
      });

      // Handle disconnection
      this.port.onDisconnect.addListener(() => {
        logger.error('Native messaging host disconnected', chrome.runtime.lastError);
        this.port = null;

        // Reject all pending messages
        for (const [id, { reject }] of this.pendingMessages) {
          reject(new Error('Native host disconnected'));
        }
        this.pendingMessages.clear();
      });

      // Test connection with a ping
      await this.sendNativeMessage({ action: 'ping' });
      logger.info('Native computer provider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize native computer provider', error);
      throw new Error(
        `Native messaging host not available. Please install the native host component. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private handleNativeMessage(message: NativeResponse & { id?: number }): void {
    if (message.id !== undefined) {
      const pending = this.pendingMessages.get(message.id);
      if (pending) {
        this.pendingMessages.delete(message.id);
        if (message.success) {
          pending.resolve(message.data);
        } else {
          pending.reject(new Error(message.error || 'Unknown error'));
        }
      }
    }
  }

  private async sendNativeMessage(message: NativeMessage): Promise<any> {
    if (!this.port) {
      throw new Error('Native messaging host not connected');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingMessages.set(id, { resolve, reject });

      // Send message with ID
      this.port!.postMessage({ ...message, id });

      // Timeout after configured time (default 30 seconds)
      const timeout = this.config.messageTimeout || 30000;
      setTimeout(() => {
        const pending = this.pendingMessages.get(id);
        if (pending) {
          this.pendingMessages.delete(id);
          reject(new Error('Native message timeout'));
        }
      }, timeout);
    });
  }

  async execute(action: AnyComputerAction): Promise<ComputerActionResult> {
    try {
      logger.debug('Executing action via native host', { type: action.type });

      const result = await this.sendNativeMessage({
        action: 'execute',
        params: action,
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Action execution failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async screenshot(fullScreen?: boolean): Promise<string> {
    logger.info('Capturing screenshot via native host', { fullScreen });

    const result = await this.sendNativeMessage({
      action: 'screenshot',
      params: { fullScreen },
    });

    return result.screenshot;
  }

  async getScreenSize(): Promise<ScreenSize> {
    const result = await this.sendNativeMessage({
      action: 'getScreenSize',
    });

    return result;
  }

  async click(point: Point, button: MouseButton = 'left', modifiers: KeyModifier[] = []): Promise<void> {
    logger.info('Clicking at coordinates via native host', { point, button, modifiers });

    await this.sendNativeMessage({
      action: 'click',
      params: { point, button, modifiers },
    });
  }

  async mouseMove(point: Point): Promise<void> {
    logger.info('Moving mouse via native host', { point });

    await this.sendNativeMessage({
      action: 'mouseMove',
      params: { point },
    });
  }

  async type(text: string, coordinates?: Point): Promise<void> {
    logger.info('Typing text via native host', { textLength: text.length, coordinates });

    await this.sendNativeMessage({
      action: 'type',
      params: { text, coordinates },
    });
  }

  async keyPress(keys: string[], modifiers: KeyModifier[] = []): Promise<void> {
    logger.info('Pressing keys via native host', { keys, modifiers });

    await this.sendNativeMessage({
      action: 'keyPress',
      params: { keys, modifiers },
    });
  }

  async scroll(deltaX: number, deltaY: number, coordinates?: Point): Promise<void> {
    logger.info('Scrolling via native host', { deltaX, deltaY, coordinates });

    await this.sendNativeMessage({
      action: 'scroll',
      params: { deltaX, deltaY, coordinates },
    });
  }

  async drag(from: Point, to: Point): Promise<void> {
    logger.info('Dragging via native host', { from, to });

    await this.sendNativeMessage({
      action: 'drag',
      params: { from, to },
    });
  }

  async wait(milliseconds: number): Promise<void> {
    logger.debug('Waiting', { milliseconds });
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async dispose(): Promise<void> {
    logger.info('Disposing native computer provider');

    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }

    // Reject all pending messages
    for (const [id, { reject }] of this.pendingMessages) {
      reject(new Error('Provider disposed'));
    }
    this.pendingMessages.clear();
  }
}
