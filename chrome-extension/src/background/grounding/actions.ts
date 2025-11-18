/**
 * Vision-based grounding actions
 * Execute actions based on coordinates rather than DOM indices
 */

import { createLogger } from '@src/background/log';
import type { Point, BoundingBox } from '../vision/types';

const logger = createLogger('GroundingActions');

export class GroundingActions {
  /**
   * Click at specific pixel coordinates
   */
  static async clickAt(tabId: number, point: Point): Promise<void> {
    logger.info('Clicking at coordinates', { tabId, point });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (x: number, y: number) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          });
          element.dispatchEvent(clickEvent);
        }
      },
      args: [point.x, point.y],
    });
  }

  /**
   * Type text at specific coordinates (focuses element first)
   */
  static async typeAt(tabId: number, point: Point, text: string): Promise<void> {
    logger.info('Typing at coordinates', { tabId, point, textLength: text.length });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (x: number, y: number, textToType: string) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          // Focus the element
          if (element instanceof HTMLElement) {
            element.focus();
          }

          // Type the text
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.value = textToType;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            // For contenteditable elements
            if (element instanceof HTMLElement && element.isContentEditable) {
              element.textContent = textToType;
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
      },
      args: [point.x, point.y, text],
    });
  }

  /**
   * Scroll to specific coordinates
   */
  static async scrollTo(tabId: number, point: Point): Promise<void> {
    logger.info('Scrolling to coordinates', { tabId, point });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (x: number, y: number) => {
        window.scrollTo({
          left: x,
          top: y,
          behavior: 'smooth',
        });
      },
      args: [point.x, point.y],
    });
  }

  /**
   * Scroll down by viewport height
   */
  static async scrollDown(tabId: number): Promise<void> {
    logger.info('Scrolling down', { tabId });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.scrollBy({
          top: window.innerHeight,
          behavior: 'smooth',
        });
      },
    });
  }

  /**
   * Scroll up by viewport height
   */
  static async scrollUp(tabId: number): Promise<void> {
    logger.info('Scrolling up', { tabId });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.scrollBy({
          top: -window.innerHeight,
          behavior: 'smooth',
        });
      },
    });
  }

  /**
   * Hover over coordinates
   */
  static async hoverAt(tabId: number, point: Point): Promise<void> {
    logger.info('Hovering at coordinates', { tabId, point });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (x: number, y: number) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const hoverEvent = new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          });
          element.dispatchEvent(hoverEvent);
        }
      },
      args: [point.x, point.y],
    });
  }

  /**
   * Draw bounding box overlay on page
   */
  static async drawBoundingBox(
    tabId: number,
    bbox: BoundingBox,
    label?: string,
    color: string = '#FF0000',
  ): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (box: BoundingBox, lbl: string | undefined, clr: string) => {
        // Remove existing overlay if any
        const existingOverlay = document.getElementById('vision-grounding-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'vision-grounding-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999999';

        // Create bounding box
        const boxDiv = document.createElement('div');
        boxDiv.style.position = 'absolute';
        boxDiv.style.left = `${box.x1}px`;
        boxDiv.style.top = `${box.y1}px`;
        boxDiv.style.width = `${box.x2 - box.x1}px`;
        boxDiv.style.height = `${box.y2 - box.y1}px`;
        boxDiv.style.border = `3px solid ${clr}`;
        boxDiv.style.backgroundColor = `${clr}22`;

        overlay.appendChild(boxDiv);

        // Add label if provided
        if (lbl) {
          const labelDiv = document.createElement('div');
          labelDiv.textContent = lbl;
          labelDiv.style.position = 'absolute';
          labelDiv.style.left = `${box.x1}px`;
          labelDiv.style.top = `${box.y1 - 25}px`;
          labelDiv.style.backgroundColor = clr;
          labelDiv.style.color = 'white';
          labelDiv.style.padding = '4px 8px';
          labelDiv.style.borderRadius = '4px';
          labelDiv.style.fontSize = '14px';
          labelDiv.style.fontWeight = 'bold';
          overlay.appendChild(labelDiv);
        }

        document.body.appendChild(overlay);
      },
      args: [bbox, label, color],
    });
  }

  /**
   * Clear all bounding box overlays
   */
  static async clearOverlays(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const overlay = document.getElementById('vision-grounding-overlay');
        if (overlay) {
          overlay.remove();
        }
      },
    });
  }

  /**
   * Get element info at coordinates
   */
  static async getElementInfo(
    tabId: number,
    point: Point,
  ): Promise<{
    tagName: string;
    text: string;
    attributes: Record<string, string>;
  } | null> {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (x: number, y: number) => {
        const element = document.elementFromPoint(x, y);
        if (!element) return null;

        const attributes: Record<string, string> = {};
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          attributes[attr.name] = attr.value;
        }

        return {
          tagName: element.tagName.toLowerCase(),
          text: element.textContent?.trim() || '',
          attributes,
        };
      },
      args: [point.x, point.y],
    });

    return result?.result || null;
  }
}
