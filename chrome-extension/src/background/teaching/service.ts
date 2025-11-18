/**
 * Teaching mode service for UI element detection and annotation
 */

import { createLogger } from '@src/background/log';
import { VisionService } from '../vision/service';
import { GroundingParser } from '../grounding/parser';
import { GroundingActions } from '../grounding/actions';
import { TeachingStorage } from './storage';
import type { TeachingSession, UIElement, PageMemory, ElementMatchResult } from './types';
import type { VisionConfig, BoundingBox, GroundedElement } from '../vision/types';

const logger = createLogger('TeachingService');

export class TeachingService {
  private visionService: VisionService;
  private activeSessions: Map<number, TeachingSession> = new Map();

  constructor(visionConfig: VisionConfig) {
    this.visionService = new VisionService(visionConfig);
  }

  /**
   * Start teaching mode for a tab
   */
  async startTeaching(tabId: number, url: string): Promise<TeachingSession> {
    logger.info('Starting teaching mode', { tabId, url });

    try {
      // Capture screenshot
      const screenshot = await this.visionService.captureScreenshot(tabId, {
        quality: 95,
        format: 'jpeg',
        fullPage: false,
      });

      // Detect interactive elements using vision model
      const detectedElements = await this.detectElements(tabId, screenshot);

      // Create teaching session
      const session: TeachingSession = {
        tabId,
        url,
        screenshot,
        detectedElements,
        userAnnotations: new Map(),
        isActive: true,
      };

      this.activeSessions.set(tabId, session);

      // Draw overlays for detected elements
      await this.drawElementOverlays(tabId, detectedElements);

      logger.info('Teaching mode started', { tabId, elementsCount: detectedElements.length });
      return session;
    } catch (error) {
      logger.error('Failed to start teaching mode', error);
      throw error;
    }
  }

  /**
   * Detect interactive elements using vision model
   */
  private async detectElements(tabId: number, screenshot: string): Promise<UIElement[]> {
    const prompt = `Analyze this screenshot and detect ALL interactive elements (buttons, inputs, links, icons, dropdowns, checkboxes, etc.).

For each interactive element, output in this exact format:
<box>(x1,y1),(x2,y2)</box> [description]

Where:
- (x1,y1) is the top-left corner
- (x2,y2) is the bottom-right corner
- [description] is a brief description of the element

Coordinates should be in pixels. Be thorough and detect ALL visible interactive elements.`;

    const response = await this.visionService.callVisionModel(screenshot, prompt);

    if (!response.success || !response.text) {
      throw new Error('Failed to detect elements: ' + response.error);
    }

    // Parse bounding boxes from response
    const boxes = GroundingParser.extractBoundingBoxes(response.text);

    // Get viewport dimensions
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    });

    const viewport = result.result;
    if (!viewport) {
      throw new Error('Failed to get viewport dimensions');
    }

    // Extract descriptions from response
    const lines = response.text.split('\n').filter(line => line.includes('<box>'));

    const elements: UIElement[] = boxes.map((bbox, index) => {
      // Find corresponding description
      const line = lines[index] || '';
      const descMatch = line.match(/\]\s*(.+)$/);
      const description = descMatch ? descMatch[1].trim() : `Element ${index + 1}`;

      return {
        id: index + 1,
        bbox,
        normalizedBbox: GroundingParser.pixelBoxToNormalized(bbox, viewport.width, viewport.height),
        autoDescription: description,
        confidence: 0.8,
        timestamp: Date.now(),
      };
    });

    logger.info('Detected elements', { count: elements.length });
    return elements;
  }

  /**
   * Draw numbered overlays for elements
   */
  private async drawElementOverlays(tabId: number, elements: UIElement[]): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (els: UIElement[]) => {
        // Remove existing overlay
        const existingOverlay = document.getElementById('teaching-mode-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'teaching-mode-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999999';

        // Draw each element
        els.forEach(element => {
          const box = element.bbox;

          // Draw bounding box
          const boxDiv = document.createElement('div');
          boxDiv.style.position = 'absolute';
          boxDiv.style.left = `${box.x1}px`;
          boxDiv.style.top = `${box.y1}px`;
          boxDiv.style.width = `${box.x2 - box.x1}px`;
          boxDiv.style.height = `${box.y2 - box.y1}px`;
          boxDiv.style.border = '3px solid #FF0000';
          boxDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';

          overlay.appendChild(boxDiv);

          // Draw label with number
          const labelDiv = document.createElement('div');
          labelDiv.textContent = `${element.id}`;
          labelDiv.style.position = 'absolute';
          labelDiv.style.left = `${box.x1}px`;
          labelDiv.style.top = `${box.y1 - 30}px`;
          labelDiv.style.backgroundColor = '#FF0000';
          labelDiv.style.color = 'white';
          labelDiv.style.padding = '6px 12px';
          labelDiv.style.borderRadius = '6px';
          labelDiv.style.fontSize = '18px';
          labelDiv.style.fontWeight = 'bold';
          labelDiv.style.fontFamily = 'Arial, sans-serif';
          labelDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          overlay.appendChild(labelDiv);

          // Draw description tooltip
          const descDiv = document.createElement('div');
          descDiv.textContent = element.autoDescription;
          descDiv.style.position = 'absolute';
          descDiv.style.left = `${box.x1}px`;
          descDiv.style.top = `${box.y2 + 5}px`;
          descDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          descDiv.style.color = 'white';
          descDiv.style.padding = '4px 8px';
          descDiv.style.borderRadius = '4px';
          descDiv.style.fontSize = '12px';
          descDiv.style.maxWidth = '200px';
          descDiv.style.wordWrap = 'break-word';

          overlay.appendChild(descDiv);
        });

        document.body.appendChild(overlay);
      },
      args: [elements],
    });
  }

  /**
   * Add user annotation to an element
   */
  async annotateElement(tabId: number, elementId: number, description: string): Promise<void> {
    const session = this.activeSessions.get(tabId);
    if (!session) {
      throw new Error('No active teaching session');
    }

    session.userAnnotations.set(elementId, description);

    const element = session.detectedElements.find(e => e.id === elementId);
    if (element) {
      element.userDescription = description;
    }

    logger.info('Added user annotation', { tabId, elementId, description });
  }

  /**
   * Save teaching session to memory
   */
  async saveSession(tabId: number): Promise<void> {
    const session = this.activeSessions.get(tabId);
    if (!session) {
      throw new Error('No active teaching session');
    }

    try {
      const urlObj = new URL(session.url);
      const domain = urlObj.hostname;

      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      });

      const viewport = result.result;
      if (!viewport) {
        throw new Error('Failed to get viewport dimensions');
      }

      const memory: PageMemory = {
        url: session.url,
        urlHash: TeachingStorage.generateUrlHash(session.url),
        domain,
        elements: session.detectedElements,
        screenshotHash: TeachingStorage.generateScreenshotHash(session.screenshot),
        viewport,
        lastUpdated: Date.now(),
      };

      await TeachingStorage.savePageMemory(memory);

      logger.info('Saved teaching session', {
        url: session.url,
        elementsCount: session.detectedElements.length,
      });
    } catch (error) {
      logger.error('Failed to save teaching session', error);
      throw error;
    }
  }

  /**
   * End teaching mode
   */
  async endTeaching(tabId: number): Promise<void> {
    const session = this.activeSessions.get(tabId);
    if (session) {
      // Clear overlays
      await GroundingActions.clearOverlays(tabId);
      this.activeSessions.delete(tabId);
      logger.info('Teaching mode ended', { tabId });
    }
  }

  /**
   * Get remembered elements for current page
   */
  async getRememberedElements(url: string): Promise<UIElement[]> {
    const memory = await TeachingStorage.getPageMemory(url);
    if (!memory) {
      return [];
    }

    logger.info('Retrieved remembered elements', { url, count: memory.elements.length });
    return memory.elements;
  }

  /**
   * Match current elements with remembered ones
   */
  async matchElements(currentElements: UIElement[], rememberedElements: UIElement[]): Promise<ElementMatchResult[]> {
    const results: ElementMatchResult[] = [];

    for (const remembered of rememberedElements) {
      let bestMatch: ElementMatchResult = {
        element: remembered,
        similarity: 0,
        matched: false,
      };

      // Find best matching current element based on IoU
      for (const current of currentElements) {
        const iou = GroundingParser.calculateIoU(current.normalizedBbox, remembered.normalizedBbox);

        if (iou > bestMatch.similarity) {
          bestMatch = {
            element: remembered,
            similarity: iou,
            matched: iou > 0.5, // Consider matched if IoU > 0.5
          };
        }
      }

      results.push(bestMatch);
    }

    logger.debug('Matched elements', {
      total: rememberedElements.length,
      matched: results.filter(r => r.matched).length,
    });

    return results;
  }

  /**
   * Update vision service config
   */
  updateVisionConfig(config: Partial<VisionConfig>): void {
    this.visionService.updateConfig(config);
  }
}
