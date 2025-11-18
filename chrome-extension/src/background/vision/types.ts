/**
 * Vision system types for Qwen3-VL integration
 */

export interface VisionConfig {
  provider: 'huggingface' | 'dashscope' | 'vllm' | 'custom';
  apiKey: string;
  baseUrl?: string;
  modelName: string;
  maxRetries: number;
  timeout: number;
}

export interface ScreenshotOptions {
  quality: number;
  format: 'png' | 'jpeg';
  fullPage: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GroundedElement {
  id: number;
  bbox: BoundingBox;
  autoDescription: string;
  userDescription?: string;
  confidence: number;
  elementType?: string;
}

export interface VisionResponse {
  text: string;
  groundedElements?: GroundedElement[];
  reasoning?: string;
  success: boolean;
  error?: string;
}

export interface GroundingFormat {
  type: 'ref' | 'box' | 'point';
  content: string;
  bbox?: BoundingBox;
  point?: Point;
  refId?: string;
}

export const DEFAULT_VISION_CONFIG: Partial<VisionConfig> = {
  provider: 'huggingface',
  modelName: 'Qwen/Qwen2-VL-72B-Instruct',
  maxRetries: 3,
  timeout: 30000,
};

export const DEFAULT_SCREENSHOT_OPTIONS: ScreenshotOptions = {
  quality: 90,
  format: 'jpeg',
  fullPage: false,
  maxWidth: 1920,
  maxHeight: 1080,
};
