/**
 * Vision service for Qwen3-VL integration
 * Handles screenshot capture and API calls to vision models
 */

import { createLogger } from '@src/background/log';
import type { VisionConfig, VisionResponse, ScreenshotOptions } from './types';
import { DEFAULT_SCREENSHOT_OPTIONS } from './types';

const logger = createLogger('VisionService');

export class VisionService {
  private config: VisionConfig;

  constructor(config: VisionConfig) {
    this.config = config;
  }

  /**
   * Capture a high-quality screenshot of the current viewport
   */
  async captureScreenshot(
    tabId: number,
    options: Partial<ScreenshotOptions> = DEFAULT_SCREENSHOT_OPTIONS,
  ): Promise<string> {
    try {
      const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, ...options };

      // Use chrome.tabs.captureVisibleTab for high-quality screenshots
      const dataUrl = await chrome.tabs.captureVisibleTab({
        format: opts.format,
        quality: opts.quality,
      });

      // Convert data URL to base64 without the prefix
      const base64 = dataUrl ? dataUrl.split(',')[1] : '';
      logger.info('Screenshot captured', { tabId, size: base64.length });
      return base64;
    } catch (error) {
      logger.error('Failed to capture screenshot', error);
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Capture full page screenshot by stitching multiple viewport captures
   */
  async captureFullPageScreenshot(tabId: number): Promise<string> {
    try {
      logger.info('Capturing full page screenshot', { tabId });

      // Get page dimensions
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }),
      });

      const pageInfo = result.result;
      if (!pageInfo) {
        throw new Error('Failed to get page dimensions');
      }

      const { scrollHeight, viewportHeight } = pageInfo;

      // If page fits in one viewport, just capture once
      if (scrollHeight <= viewportHeight) {
        return this.captureScreenshot(tabId);
      }

      // For now, return single viewport screenshot
      // TODO: Implement full page stitching in future iteration
      logger.warning('Full page stitching not yet implemented, returning viewport screenshot');
      return this.captureScreenshot(tabId);
    } catch (error) {
      logger.error('Failed to capture full page screenshot', error);
      throw error;
    }
  }

  /**
   * Call Qwen3-VL API with image and prompt
   */
  async callVisionModel(imageBase64: string, prompt: string, systemPrompt?: string): Promise<VisionResponse> {
    try {
      logger.info('Calling vision model', {
        provider: this.config.provider,
        model: this.config.modelName,
        promptLength: prompt.length,
      });

      switch (this.config.provider) {
        case 'huggingface':
          return await this.callHuggingFace(imageBase64, prompt, systemPrompt);
        case 'dashscope':
          return await this.callDashScope(imageBase64, prompt, systemPrompt);
        case 'vllm':
          return await this.callVLLM(imageBase64, prompt, systemPrompt);
        case 'custom':
          return await this.callCustomEndpoint(imageBase64, prompt, systemPrompt);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      logger.error('Vision model call failed', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Call HuggingFace Inference API
   */
  private async callHuggingFace(imageBase64: string, prompt: string, systemPrompt?: string): Promise<VisionResponse> {
    const url = this.config.baseUrl || 'https://api-inference.huggingface.co/models/' + this.config.modelName;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: messages,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${error}`);
    }

    const data = await response.json();
    return {
      text: data.generated_text || data[0]?.generated_text || '',
      success: true,
    };
  }

  /**
   * Call DashScope (AliCloud) API
   */
  private async callDashScope(imageBase64: string, prompt: string, systemPrompt?: string): Promise<VisionResponse> {
    const url =
      this.config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({
      role: 'user',
      content: [{ text: prompt }, { image: `data:image/jpeg;base64,${imageBase64}` }],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        input: { messages },
        parameters: {
          max_tokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DashScope API error: ${error}`);
    }

    const data = await response.json();
    return {
      text: data.output?.choices?.[0]?.message?.content || '',
      success: true,
    };
  }

  /**
   * Call vLLM endpoint
   */
  private async callVLLM(imageBase64: string, prompt: string, systemPrompt?: string): Promise<VisionResponse> {
    if (!this.config.baseUrl) {
      throw new Error('vLLM requires baseUrl to be configured');
    }

    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`vLLM API error: ${error}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      success: true,
    };
  }

  /**
   * Call custom OpenAI-compatible endpoint
   */
  private async callCustomEndpoint(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string,
  ): Promise<VisionResponse> {
    if (!this.config.baseUrl) {
      throw new Error('Custom endpoint requires baseUrl to be configured');
    }

    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom endpoint API error: ${error}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      success: true,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Vision config updated', { provider: this.config.provider });
  }
}
