/**
 * Types for UI element teaching and memory system
 */

import type { BoundingBox } from '../vision/types';

export interface UIElement {
  id: number;
  bbox: BoundingBox;
  normalizedBbox: BoundingBox; // Normalized to 0-1000 scale
  autoDescription: string;
  userDescription?: string;
  elementType?: string;
  confidence: number;
  timestamp: number;
}

export interface PageMemory {
  url: string;
  urlHash: string;
  domain: string;
  elements: UIElement[];
  screenshotHash: string;
  viewport: {
    width: number;
    height: number;
  };
  lastUpdated: number;
}

export interface TeachingSession {
  tabId: number;
  url: string;
  screenshot: string;
  detectedElements: UIElement[];
  userAnnotations: Map<number, string>;
  isActive: boolean;
}

export interface ElementMatchResult {
  element: UIElement;
  similarity: number;
  matched: boolean;
}
