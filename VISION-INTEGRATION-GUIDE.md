# Vision System Integration Guide

This guide shows how to integrate the vision-first architecture into Nanobrowser's existing agent system.

## Quick Start

### 1. Add Vision Config to Options

Update the options page to include vision configuration:

```typescript
// pages/options/src/Options.tsx

interface OptionsState {
  // ... existing options
  visionEnabled: boolean;
  visionProvider: 'huggingface' | 'dashscope' | 'vllm' | 'custom';
  visionApiKey: string;
  visionBaseUrl?: string;
  visionModelName: string;
}

// Add to form
<div>
  <label>
    <input
      type="checkbox"
      checked={options.visionEnabled}
      onChange={(e) => setOptions({ ...options, visionEnabled: e.target.checked })}
    />
    Enable Vision-First Mode
  </label>
</div>

{options.visionEnabled && (
  <>
    <select
      value={options.visionProvider}
      onChange={(e) => setOptions({ ...options, visionProvider: e.target.value })}
    >
      <option value="huggingface">HuggingFace</option>
      <option value="dashscope">DashScope (AliCloud)</option>
      <option value="vllm">vLLM (Self-hosted)</option>
      <option value="custom">Custom Endpoint</option>
    </select>

    <input
      type="text"
      placeholder="API Key"
      value={options.visionApiKey}
      onChange={(e) => setOptions({ ...options, visionApiKey: e.target.value })}
    />

    {(options.visionProvider === 'vllm' || options.visionProvider === 'custom') && (
      <input
        type="text"
        placeholder="Base URL (e.g., http://localhost:8000)"
        value={options.visionBaseUrl}
        onChange={(e) => setOptions({ ...options, visionBaseUrl: e.target.value })}
      />
    )}

    <input
      type="text"
      placeholder="Model Name"
      value={options.visionModelName}
      onChange={(e) => setOptions({ ...options, visionModelName: e.target.value })}
    />
  </>
)}
```

### 2. Initialize Vision System in Background

```typescript
// chrome-extension/src/background/index.ts

import { VisionService } from './vision';
import { TeachingService } from './teaching';
import { VisionActionBuilder } from './agent/actions/vision-builder';
import type { VisionConfig } from './vision/types';

// Global vision services
let visionService: VisionService | null = null;
let teachingService: TeachingService | null = null;

// Initialize vision system
async function initializeVisionSystem() {
  const config = await chrome.storage.local.get([
    'visionEnabled',
    'visionProvider',
    'visionApiKey',
    'visionBaseUrl',
    'visionModelName',
  ]);

  if (config.visionEnabled && config.visionApiKey) {
    const visionConfig: VisionConfig = {
      provider: config.visionProvider,
      apiKey: config.visionApiKey,
      baseUrl: config.visionBaseUrl,
      modelName: config.visionModelName || 'Qwen/Qwen2-VL-72B-Instruct',
      maxRetries: 3,
      timeout: 30000,
    };

    visionService = new VisionService(visionConfig);
    teachingService = new TeachingService(visionConfig);

    console.log('Vision system initialized:', {
      provider: visionConfig.provider,
      model: visionConfig.modelName,
    });
  }
}

// Initialize on startup
initializeVisionSystem();

// Re-initialize when config changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.visionEnabled || changes.visionProvider)) {
    initializeVisionSystem();
  }
});
```

### 3. Integrate Vision Actions into Executor

```typescript
// chrome-extension/src/background/agent/executor.ts

import { VisionActionBuilder } from './actions/vision-builder';
import { ActionBuilder } from './actions/builder';
import { NavigatorActionRegistry } from './agents/navigator';

export class TaskExecutor {
  // ...existing code...

  private setupActions() {
    // Get vision config
    const visionConfig = await this.getVisionConfig();
    
    // Build standard DOM-based actions
    const actionBuilder = new ActionBuilder(this.context, this.extractorLLM);
    const domActions = actionBuilder.buildDefaultActions();

    // Build vision-based actions if enabled
    let visionActions: Action[] = [];
    if (visionConfig && visionConfig.apiKey) {
      const visionBuilder = new VisionActionBuilder(this.context, visionConfig);
      visionActions = visionBuilder.buildVisionActions();
    }

    // Combine actions
    const allActions = [...domActions, ...visionActions];

    // Register with Navigator
    this.navigatorRegistry = new NavigatorActionRegistry(allActions);
  }

  private async getVisionConfig(): Promise<VisionConfig | null> {
    const config = await chrome.storage.local.get([
      'visionEnabled',
      'visionProvider',
      'visionApiKey',
      'visionBaseUrl',
      'visionModelName',
    ]);

    if (!config.visionEnabled || !config.visionApiKey) {
      return null;
    }

    return {
      provider: config.visionProvider,
      apiKey: config.visionApiKey,
      baseUrl: config.visionBaseUrl,
      modelName: config.visionModelName || 'Qwen/Qwen2-VL-72B-Instruct',
      maxRetries: 3,
      timeout: 30000,
    };
  }
}
```

### 4. Update Navigator to Use Vision

```typescript
// chrome-extension/src/background/agent/agents/navigator.ts

import { VisionService } from '@src/background/vision';

export class NavigatorAgent extends BaseAgent {
  private visionService: VisionService | null = null;

  async execute(): Promise<AgentOutput<NavigatorResult>> {
    // Check if vision is enabled
    const useVision = await this.shouldUseVision();

    if (useVision && this.visionService) {
      return await this.executeWithVision();
    } else {
      return await this.executeWithDOM();
    }
  }

  private async shouldUseVision(): Promise<boolean> {
    const config = await chrome.storage.local.get(['visionEnabled']);
    return config.visionEnabled || false;
  }

  private async executeWithVision(): Promise<AgentOutput<NavigatorResult>> {
    // Capture screenshot
    const page = await this.context.browserContext.getCurrentPage();
    const screenshot = await this.visionService!.captureScreenshot(page.tabId);

    // Add screenshot to message context
    const messageManager = this.context.messageManager;
    const currentMessages = messageManager.getMessages();

    // Enhance last message with screenshot
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage && typeof lastMessage.content === 'string') {
      lastMessage.content = [
        { type: 'text', text: lastMessage.content },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshot}` } },
      ];
    }

    // Continue with normal execution
    return await this.executeWithDOM();
  }
}
```

### 5. Add Teaching Mode to Side Panel

```typescript
// pages/side-panel/src/components/TeachingMode.tsx

import React, { useState } from 'react';
import { sendMessage } from '@extension/shared';

export function TeachingMode() {
  const [isActive, setIsActive] = useState(false);
  const [elements, setElements] = useState<any[]>([]);

  const startTeaching = async () => {
    const response = await sendMessage('START_TEACHING', {});
    if (response.success) {
      setIsActive(true);
      setElements(response.elements || []);
    }
  };

  const annotateElement = async (elementId: number, description: string) => {
    await sendMessage('ANNOTATE_ELEMENT', { elementId, description });
  };

  const endTeaching = async (save: boolean) => {
    await sendMessage('END_TEACHING', { save });
    setIsActive(false);
    setElements([]);
  };

  return (
    <div className="teaching-mode">
      {!isActive ? (
        <button onClick={startTeaching}>
          🎓 Start Teaching Mode
        </button>
      ) : (
        <div>
          <h3>Detected Elements: {elements.length}</h3>
          <div className="element-list">
            {elements.map(el => (
              <div key={el.id}>
                <span>#{el.id}</span>
                <input
                  type="text"
                  placeholder="Add description..."
                  onBlur={(e) => annotateElement(el.id, e.target.value)}
                />
                <span>{el.autoDescription}</span>
              </div>
            ))}
          </div>
          <button onClick={() => endTeaching(true)}>
            💾 Save & Exit
          </button>
          <button onClick={() => endTeaching(false)}>
            ❌ Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

### 6. Add Message Handlers

```typescript
// chrome-extension/src/background/index.ts

// Add to message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_TEACHING':
      handleStartTeaching(message).then(sendResponse);
      return true;

    case 'ANNOTATE_ELEMENT':
      handleAnnotateElement(message).then(sendResponse);
      return true;

    case 'END_TEACHING':
      handleEndTeaching(message).then(sendResponse);
      return true;

    // ... other handlers
  }
});

async function handleStartTeaching(message: any) {
  if (!teachingService) {
    return { success: false, error: 'Vision system not enabled' };
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.url) {
      return { success: false, error: 'No active tab' };
    }

    const session = await teachingService.startTeaching(tab.id, tab.url);
    return {
      success: true,
      elements: session.detectedElements,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleAnnotateElement(message: any) {
  if (!teachingService) {
    return { success: false, error: 'Vision system not enabled' };
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      return { success: false, error: 'No active tab' };
    }

    await teachingService.annotateElement(
      tab.id,
      message.elementId,
      message.description
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleEndTeaching(message: any) {
  if (!teachingService) {
    return { success: false, error: 'Vision system not enabled' };
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      return { success: false, error: 'No active tab' };
    }

    if (message.save) {
      await teachingService.saveSession(tab.id);
    }

    await teachingService.endTeaching(tab.id);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### 7. Update Prompts to Use Vision

```typescript
// chrome-extension/src/background/agent/prompts/navigator.ts

import {
  VISION_SYSTEM_PROMPT,
  VISION_NAVIGATOR_PROMPT,
} from './vision-prompts';

export class NavigatorPrompt extends BasePrompt {
  getSystemMessage(): BaseMessage {
    // Check if vision is enabled
    const useVision = this.context.options.useVision;

    if (useVision) {
      // Use vision-first prompts
      return new SystemMessage(VISION_SYSTEM_PROMPT + '\n\n' + VISION_NAVIGATOR_PROMPT);
    } else {
      // Use existing DOM-based prompts
      return new SystemMessage(this.getStandardSystemPrompt());
    }
  }
}
```

## Advanced Integration

### Hybrid Mode: Vision + DOM

Use both vision and DOM for maximum accuracy:

```typescript
async executeHybrid(): Promise<AgentOutput<NavigatorResult>> {
  // Get both vision and DOM state
  const screenshot = await this.visionService!.captureScreenshot(page.tabId);
  const domState = await page.getState();

  // Build combined context
  const message = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `Screenshot analysis with DOM context:
               Elements: ${domState.selectorMap.size}
               URL: ${domState.url}
               Title: ${domState.title}`,
      },
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${screenshot}` },
      },
    ],
  };

  // Execute with both inputs
  // ...
}
```

### Smart Element Selection

Choose best action method based on context:

```typescript
async smartClick(description: string): Promise<void> {
  // Try remembered elements first (fastest)
  const elements = await teachingService.getRememberedElements(url);
  const element = elements.find(e =>
    e.userDescription?.includes(description) ||
    e.autoDescription.includes(description)
  );

  if (element) {
    // Use coordinates from memory
    await GroundingActions.clickAt(tabId, getBBoxCenter(element.bbox));
    return;
  }

  // Try DOM-based selection (medium speed)
  const domElement = domState.selectorMap.get(findElementByText(description));
  if (domElement) {
    await page.clickElementNode(useVision, domElement);
    return;
  }

  // Fall back to vision detection (slowest, most flexible)
  const screenshot = await visionService.captureScreenshot(tabId);
  const response = await visionService.callVisionModel(
    screenshot,
    `Find and return the bounding box of: ${description}`
  );

  const boxes = GroundingParser.extractBoundingBoxes(response.text);
  if (boxes.length > 0) {
    await GroundingActions.clickAt(tabId, getBBoxCenter(boxes[0]));
  }
}
```

## Testing

### Unit Tests

```typescript
// __tests__/vision-service.test.ts

import { VisionService } from '@src/background/vision';

describe('VisionService', () => {
  it('should capture screenshot', async () => {
    const service = new VisionService(mockConfig);
    const screenshot = await service.captureScreenshot(1);
    expect(screenshot).toBeTruthy();
    expect(typeof screenshot).toBe('string');
  });

  it('should call vision API', async () => {
    const service = new VisionService(mockConfig);
    const response = await service.callVisionModel(
      'base64image',
      'test prompt'
    );
    expect(response.success).toBe(true);
  });
});
```

### E2E Tests

```typescript
// e2e/vision-integration.test.ts

test('teaching mode flow', async () => {
  // Start teaching
  const startResponse = await sendMessage('START_TEACHING');
  expect(startResponse.success).toBe(true);
  expect(startResponse.elements.length).toBeGreaterThan(0);

  // Annotate element
  await sendMessage('ANNOTATE_ELEMENT', {
    elementId: 1,
    description: 'test button',
  });

  // End teaching
  await sendMessage('END_TEACHING', { save: true });

  // Verify saved
  const memory = await TeachingStorage.getPageMemory(testUrl);
  expect(memory).toBeTruthy();
  expect(memory.elements[0].userDescription).toBe('test button');
});
```

## Debugging

### Enable Debug Logging

```typescript
// Set in options or config
{
  debugVision: true,
}

// In vision service
if (config.debugVision) {
  console.log('Vision API Request:', {
    provider: this.config.provider,
    imageSize: imageBase64.length,
    promptLength: prompt.length,
  });

  console.log('Vision API Response:', {
    success: response.success,
    textLength: response.text?.length,
    error: response.error,
  });
}
```

### Visual Debugging

```typescript
// Draw all detected elements
for (const element of session.detectedElements) {
  await GroundingActions.drawBoundingBox(
    tabId,
    element.bbox,
    `${element.id}: ${element.autoDescription}`,
    '#FF0000'
  );
}

// Wait for inspection
await new Promise(resolve => setTimeout(resolve, 5000));

// Clear overlays
await GroundingActions.clearOverlays(tabId);
```

## Performance Optimization

### 1. Cache Screenshots

```typescript
const screenshotCache = new Map<number, { screenshot: string; timestamp: number }>();

async function getCachedScreenshot(tabId: number, maxAge: number = 2000): Promise<string> {
  const cached = screenshotCache.get(tabId);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < maxAge) {
    return cached.screenshot;
  }

  const screenshot = await visionService.captureScreenshot(tabId);
  screenshotCache.set(tabId, { screenshot, timestamp: now });
  return screenshot;
}
```

### 2. Batch Element Detection

```typescript
// Detect all elements in one API call
const allElements = await teachingService.startTeaching(tabId, url);

// Instead of multiple calls for individual elements
for (let i = 0; i < actions.length; i++) {
  // Use cached detection results
}
```

### 3. Lazy Loading

```typescript
// Don't initialize vision system until needed
let visionSystem: VisionSystem | null = null;

async function getVisionSystem(): Promise<VisionSystem> {
  if (!visionSystem) {
    visionSystem = await initializeVisionSystem();
  }
  return visionSystem;
}
```

## Migration Path

### Phase 1: Parallel Mode (Current)
- Vision system available alongside DOM
- Users can enable/disable in options
- Both action sets available to agents

### Phase 2: Hybrid Mode
- Agent decides which method to use
- Vision for complex/visual tasks
- DOM for speed/reliability

### Phase 3: Vision-First Mode
- Vision as primary method
- DOM as fallback
- Teaching mode default for new sites

### Phase 4: Vision-Only Mode
- Remove DOM dependencies
- Pure coordinate-based actions
- Full grounding support

## Next Steps

1. **Complete integration** following this guide
2. **Test thoroughly** with real-world scenarios
3. **Gather feedback** from users
4. **Optimize performance** based on metrics
5. **Extend capabilities** with new actions
6. **Document learnings** for community

## Support

For issues or questions:
- Check [VISION-SYSTEM.md](./VISION-SYSTEM.md) for API reference
- Review [Qwen3-VL cookbook](https://github.com/QwenLM/Qwen3-VL/blob/main/cookbooks/computer_use.ipynb)
- Open an issue on GitHub
- Join Discord community
