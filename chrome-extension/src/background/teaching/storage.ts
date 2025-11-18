/**
 * Storage service for UI element memory
 * Uses chrome.storage.local for persistence
 */

import { createLogger } from '@src/background/log';
import type { PageMemory, UIElement } from './types';
import { createHash } from 'crypto';

const logger = createLogger('TeachingStorage');

const STORAGE_KEY_PREFIX = 'ui_memory_';
const MAX_MEMORIES_PER_DOMAIN = 10;

export class TeachingStorage {
  /**
   * Generate hash for URL (used as storage key)
   */
  static generateUrlHash(url: string): string {
    try {
      const urlObj = new URL(url);
      const normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      // Use a simple hash since crypto might not be available
      return this.simpleHash(normalizedUrl);
    } catch {
      return this.simpleHash(url);
    }
  }

  /**
   * Simple hash function for strings
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate hash for screenshot
   */
  static generateScreenshotHash(screenshot: string): string {
    // Use first and last 1000 chars as a simple hash
    const sample = screenshot.substring(0, 1000) + screenshot.substring(screenshot.length - 1000);
    return this.simpleHash(sample);
  }

  /**
   * Save page memory
   */
  static async savePageMemory(memory: PageMemory): Promise<void> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${memory.urlHash}`;
      await chrome.storage.local.set({ [key]: memory });
      logger.info('Saved page memory', { url: memory.url, elementsCount: memory.elements.length });
    } catch (error) {
      logger.error('Failed to save page memory', error);
      throw error;
    }
  }

  /**
   * Get page memory by URL
   */
  static async getPageMemory(url: string): Promise<PageMemory | null> {
    try {
      const urlHash = this.generateUrlHash(url);
      const key = `${STORAGE_KEY_PREFIX}${urlHash}`;
      const result = await chrome.storage.local.get(key);
      const memory = result[key] as PageMemory | undefined;

      if (memory) {
        logger.info('Retrieved page memory', { url, elementsCount: memory.elements.length });
        return memory;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get page memory', error);
      return null;
    }
  }

  /**
   * Get all page memories for a domain
   */
  static async getDomainMemories(domain: string): Promise<PageMemory[]> {
    try {
      const allData = await chrome.storage.local.get(null);
      const memories: PageMemory[] = [];

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          const memory = value as PageMemory;
          if (memory.domain === domain) {
            memories.push(memory);
          }
        }
      }

      logger.info('Retrieved domain memories', { domain, count: memories.length });
      return memories.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (error) {
      logger.error('Failed to get domain memories', error);
      return [];
    }
  }

  /**
   * Update element with user description
   */
  static async updateElementDescription(url: string, elementId: number, userDescription: string): Promise<void> {
    try {
      const memory = await this.getPageMemory(url);
      if (!memory) {
        throw new Error('Page memory not found');
      }

      const element = memory.elements.find(e => e.id === elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      element.userDescription = userDescription;
      memory.lastUpdated = Date.now();

      await this.savePageMemory(memory);
      logger.info('Updated element description', { url, elementId, userDescription });
    } catch (error) {
      logger.error('Failed to update element description', error);
      throw error;
    }
  }

  /**
   * Delete page memory
   */
  static async deletePageMemory(url: string): Promise<void> {
    try {
      const urlHash = this.generateUrlHash(url);
      const key = `${STORAGE_KEY_PREFIX}${urlHash}`;
      await chrome.storage.local.remove(key);
      logger.info('Deleted page memory', { url });
    } catch (error) {
      logger.error('Failed to delete page memory', error);
      throw error;
    }
  }

  /**
   * Clear all memories
   */
  static async clearAllMemories(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allData).filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await chrome.storage.local.remove(keysToRemove);
      logger.info('Cleared all memories', { count: keysToRemove.length });
    } catch (error) {
      logger.error('Failed to clear all memories', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  static async getStats(): Promise<{
    totalMemories: number;
    totalElements: number;
    bytesUsed: number;
  }> {
    try {
      const allData = await chrome.storage.local.get(null);
      let totalMemories = 0;
      let totalElements = 0;

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          totalMemories++;
          const memory = value as PageMemory;
          totalElements += memory.elements.length;
        }
      }

      const bytesUsed = await chrome.storage.local.getBytesInUse();

      return {
        totalMemories,
        totalElements,
        bytesUsed,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', error);
      return {
        totalMemories: 0,
        totalElements: 0,
        bytesUsed: 0,
      };
    }
  }
}
