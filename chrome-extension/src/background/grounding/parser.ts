/**
 * Grounding format parser for Qwen3-VL outputs
 * Parses <ref>, <box>, and <point> formats
 */

import { createLogger } from '@src/background/log';
import type { BoundingBox, Point, GroundingFormat } from '../vision/types';

const logger = createLogger('GroundingParser');

export class GroundingParser {
  /**
   * Parse grounding formats from text: <ref>text</ref>, <box>(x1,y1),(x2,y2)</box>, <point>(x,y)</point>
   */
  static parseGrounding(text: string): GroundingFormat[] {
    const formats: GroundingFormat[] = [];

    // Parse <ref>...</ref>
    const refRegex = /<ref>(.*?)<\/ref>/g;
    let match;
    while ((match = refRegex.exec(text)) !== null) {
      formats.push({
        type: 'ref',
        content: match[1],
        refId: match[1],
      });
    }

    // Parse <box>(x1,y1),(x2,y2)</box>
    const boxRegex = /<box>\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\),\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)<\/box>/g;
    while ((match = boxRegex.exec(text)) !== null) {
      const bbox: BoundingBox = {
        x1: parseFloat(match[1]),
        y1: parseFloat(match[2]),
        x2: parseFloat(match[3]),
        y2: parseFloat(match[4]),
      };
      formats.push({
        type: 'box',
        content: match[0],
        bbox,
      });
    }

    // Parse <point>(x,y)</point>
    const pointRegex = /<point>\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)<\/point>/g;
    while ((match = pointRegex.exec(text)) !== null) {
      const point: Point = {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
      };
      formats.push({
        type: 'point',
        content: match[0],
        point,
      });
    }

    logger.debug('Parsed grounding formats', { count: formats.length, formats });
    return formats;
  }

  /**
   * Extract bounding boxes from text
   */
  static extractBoundingBoxes(text: string): BoundingBox[] {
    const formats = this.parseGrounding(text);
    return formats.filter(f => f.type === 'box' && f.bbox).map(f => f.bbox!);
  }

  /**
   * Extract points from text
   */
  static extractPoints(text: string): Point[] {
    const formats = this.parseGrounding(text);
    return formats.filter(f => f.type === 'point' && f.point).map(f => f.point!);
  }

  /**
   * Extract references from text
   */
  static extractReferences(text: string): string[] {
    const formats = this.parseGrounding(text);
    return formats.filter(f => f.type === 'ref' && f.refId).map(f => f.refId!);
  }

  /**
   * Convert normalized coordinates (0-1000) to pixel coordinates
   */
  static normalizedToPixel(normalized: number, dimension: number): number {
    return Math.round((normalized / 1000) * dimension);
  }

  /**
   * Convert pixel coordinates to normalized (0-1000)
   */
  static pixelToNormalized(pixel: number, dimension: number): number {
    return Math.round((pixel / dimension) * 1000);
  }

  /**
   * Convert normalized bounding box to pixel coordinates
   */
  static normalizedBoxToPixel(bbox: BoundingBox, width: number, height: number): BoundingBox {
    return {
      x1: this.normalizedToPixel(bbox.x1, width),
      y1: this.normalizedToPixel(bbox.y1, height),
      x2: this.normalizedToPixel(bbox.x2, width),
      y2: this.normalizedToPixel(bbox.y2, height),
    };
  }

  /**
   * Convert pixel bounding box to normalized coordinates
   */
  static pixelBoxToNormalized(bbox: BoundingBox, width: number, height: number): BoundingBox {
    return {
      x1: this.pixelToNormalized(bbox.x1, width),
      y1: this.pixelToNormalized(bbox.y1, height),
      x2: this.pixelToNormalized(bbox.x2, width),
      y2: this.pixelToNormalized(bbox.y2, height),
    };
  }

  /**
   * Get center point of a bounding box
   */
  static getBBoxCenter(bbox: BoundingBox): Point {
    return {
      x: (bbox.x1 + bbox.x2) / 2,
      y: (bbox.y1 + bbox.y2) / 2,
    };
  }

  /**
   * Check if a point is inside a bounding box
   */
  static isPointInBox(point: Point, bbox: BoundingBox): boolean {
    return point.x >= bbox.x1 && point.x <= bbox.x2 && point.y >= bbox.y1 && point.y <= bbox.y2;
  }

  /**
   * Calculate IoU (Intersection over Union) between two bounding boxes
   */
  static calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x1, box2.x1);
    const y1 = Math.max(box1.y1, box2.y1);
    const x2 = Math.min(box1.x2, box2.x2);
    const y2 = Math.min(box1.y2, box2.y2);

    if (x2 < x1 || y2 < y1) {
      return 0;
    }

    const intersectionArea = (x2 - x1) * (y2 - y1);
    const box1Area = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
    const box2Area = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);
    const unionArea = box1Area + box2Area - intersectionArea;

    return intersectionArea / unionArea;
  }
}
