/**
 * Factory for creating computer providers
 */

import { createLogger } from '@src/background/log';
import type { IComputerProvider, ComputerConfig, ComputerMode } from './types';
import { BrowserComputerProvider } from './browser-provider';
import { NativeComputerProvider } from './native-provider';

const logger = createLogger('ComputerFactory');

export class ComputerProviderFactory {
  /**
   * Create a computer provider based on configuration
   */
  static async create(config: ComputerConfig): Promise<IComputerProvider> {
    logger.info('Creating computer provider', { mode: config.mode });

    let provider: IComputerProvider;

    switch (config.mode) {
      case 'browser_only':
        provider = new BrowserComputerProvider(config);
        break;

      case 'desktop':
        provider = new NativeComputerProvider(config);
        break;

      case 'hybrid':
        // For hybrid mode, prefer native if available, fallback to browser
        try {
          provider = new NativeComputerProvider(config);
          await provider.initialize();
          logger.info('Using native provider for hybrid mode');
          return provider;
        } catch (error) {
          logger.error('Native provider not available, falling back to browser mode', error);
          provider = new BrowserComputerProvider(config);
        }
        break;

      default:
        throw new Error(`Unknown computer mode: ${config.mode}`);
    }

    await provider.initialize();
    return provider;
  }

  /**
   * Auto-detect the best available provider
   */
  static async autoDetect(): Promise<IComputerProvider> {
    logger.info('Auto-detecting best computer provider');

    // Try native first for full OS control
    try {
      const nativeProvider = new NativeComputerProvider();
      await nativeProvider.initialize();
      logger.info('Native provider available, using desktop mode');
      return nativeProvider;
    } catch (error) {
      logger.info('Native provider not available, using browser mode', error);
      const browserProvider = new BrowserComputerProvider();
      await browserProvider.initialize();
      return browserProvider;
    }
  }
}
