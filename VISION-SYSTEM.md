# Vision-First Web Automation System

This document explains the vision-first architecture implemented in Nanobrowser for web automation using Qwen3-VL-30B.

## Overview

The vision-first system enables Nanobrowser to interact with web pages using computer vision and coordinate-based actions, similar to how humans view and interact with websites. Instead of relying solely on DOM structure and accessibility trees, the system:

1. **Captures** high-resolution screenshots of web pages
2. **Analyzes** them using Qwen3-VL vision-language model
3. **Grounds** actions to precise pixel coordinates
4. **Learns** element locations for faster future interactions

## Architecture

### Components

```
chrome-extension/src/background/
├── vision/              # Vision and screenshot capture
│   ├── service.ts      # API integration (HuggingFace, DashScope, vLLM)
│   └── types.ts        # Vision-related types
├── grounding/          # Coordinate-based interaction
│   ├── parser.ts       # Parse <ref>, <box>, <point> formats
│   └── actions.ts      # Coordinate-based actions
└── teaching/           # UI element learning
    ├── service.ts      # Teaching mode orchestration
    ├── storage.ts      # Persistent memory
    └── types.ts        # Teaching-related types
```

## Core Modules

### 1. Vision Module

**Purpose**: Capture screenshots and communicate with vision models

**Key Features**:
- High-quality screenshot capture using `chrome.tabs.captureVisibleTab`
- Multi-provider support (HuggingFace, DashScope, vLLM, custom)
- Configurable image quality and format
- Full-page screenshot capability (future)

**API Example**:
```typescript
import { VisionService } from '@src/background/vision';

const visionService = new VisionService({
  provider: 'huggingface',
  apiKey: 'your-api-key',
  modelName: 'Qwen/Qwen2-VL-72B-Instruct',
  maxRetries: 3,
  timeout: 30000,
});

// Capture screenshot
const screenshot = await visionService.captureScreenshot(tabId, {
  quality: 90,
  format: 'jpeg',
});

// Call vision model
const response = await visionService.callVisionModel(
  screenshot,
  'What interactive elements are on this page?',
  'You are a web automation agent...'
);
```

### 2. Grounding Module

**Purpose**: Parse and execute coordinate-based actions

**Key Features**:
- Parse Qwen3-VL grounding formats: `<ref>`, `<box>(x1,y1),(x2,y2)`, `<point>(x,y)`
- Coordinate normalization (0-1000 scale for resolution independence)
- Bounding box operations (IoU, center point, containment)
- Visual overlay system for debugging

**Grounding Format Examples**:
```
<ref>search button</ref>              # Reference by description
<box>(100,50),(250,90)</box>          # Bounding box
<point>(175,70)</point>                # Single point
```

**Action Example**:
```typescript
import { GroundingActions } from '@src/background/grounding';

// Click at specific coordinates
await GroundingActions.clickAt(tabId, { x: 850, y: 320 });

// Type at coordinates (focuses element first)
await GroundingActions.typeAt(tabId, { x: 500, y: 200 }, 'search query');

// Draw visual overlay
await GroundingActions.drawBoundingBox(
  tabId,
  { x1: 100, y1: 50, x2: 250, y2: 90 },
  'Search Button',
  '#FF0000'
);
```

### 3. Teaching/Memory System

**Purpose**: Learn and remember UI element locations across sessions

**Key Features**:
- Automatic element detection using vision model
- Interactive annotation with numbered overlays
- Persistent storage (chrome.storage.local)
- Element matching across page loads
- Domain-based memory organization

**Teaching Workflow**:
```typescript
import { TeachingService } from '@src/background/teaching';

const teachingService = new TeachingService(visionConfig);

// 1. Start teaching mode (detects all interactive elements)
const session = await teachingService.startTeaching(tabId, url);
// System shows numbered overlays on all detected elements

// 2. Annotate elements with descriptions
await teachingService.annotateElement(tabId, 1, 'main search button');
await teachingService.annotateElement(tabId, 5, 'login link');
await teachingService.annotateElement(tabId, 12, 'shopping cart icon');

// 3. Save annotations
await teachingService.saveSession(tabId);
await teachingService.endTeaching(tabId);

// 4. Later, retrieve and use taught elements
const elements = await teachingService.getRememberedElements(url);
// Click by reference instead of coordinates
await GroundingActions.clickAt(tabId, {
  x: elements[0].bbox.x1 + (elements[0].bbox.x2 - elements[0].bbox.x1) / 2,
  y: elements[0].bbox.y1 + (elements[0].bbox.y2 - elements[0].bbox.y1) / 2,
});
```

## Vision-Based Actions

The system provides coordinate-based actions that work with vision:

| Action | Description | Example |
|--------|-------------|---------|
| `click_at(x, y)` | Click at pixel coordinates | `click_at(850, 320)` |
| `type_at(x, y, text)` | Type text at coordinates | `type_at(500, 200, "query")` |
| `hover_at(x, y)` | Hover over coordinates | `hover_at(300, 150)` |
| `scroll_down()` | Scroll down one viewport | `scroll_down()` |
| `scroll_up()` | Scroll up one viewport | `scroll_up()` |
| `scroll_to(x, y)` | Scroll to coordinates | `scroll_to(0, 1000)` |
| `start_teaching()` | Enter teaching mode | `start_teaching()` |
| `annotate_element(id, desc)` | Label an element | `annotate_element(5, "login")` |
| `end_teaching(save)` | Exit teaching mode | `end_teaching(true)` |
| `click_ref(ref)` | Click by reference | `click_ref("search button")` |

## Qwen3-VL Integration

### Model Selection

**Recommended Models**:
- **Primary**: `Qwen/Qwen2-VL-72B-Instruct` (HuggingFace)
- **Alternative**: `Qwen/Qwen2-VL-7B-Instruct` (faster, less accurate)
- **Custom**: Any vision-language model with grounding support

### API Providers

#### 1. HuggingFace Inference API
```typescript
{
  provider: 'huggingface',
  apiKey: 'hf_xxxxx',
  modelName: 'Qwen/Qwen2-VL-72B-Instruct',
}
```

#### 2. DashScope (AliCloud)
```typescript
{
  provider: 'dashscope',
  apiKey: 'sk-xxxxx',
  modelName: 'qwen-vl-max',
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
}
```

#### 3. vLLM Self-Hosted
```typescript
{
  provider: 'vllm',
  baseUrl: 'http://localhost:8000',
  modelName: 'Qwen/Qwen2-VL-72B-Instruct',
}
```

#### 4. Custom OpenAI-Compatible
```typescript
{
  provider: 'custom',
  baseUrl: 'https://your-endpoint.com',
  apiKey: 'your-key',
  modelName: 'your-model',
}
```

### Prompt Engineering

The system uses prompts adapted from the [Qwen3-VL computer-use cookbook](https://github.com/QwenLM/Qwen3-VL/blob/main/cookbooks/computer_use.ipynb):

**System Prompt Structure**:
```
You are a vision-based web automation agent powered by Qwen3-VL.

## Your Capabilities
[List of available actions]

## Grounding Format
- <ref>description</ref> - Reference by description
- <box>(x1,y1),(x2,y2)</box> - Bounding box
- <point>(x,y)</point> - Single point

## Best Practices
[Guidelines for effective automation]
```

**Navigator Prompt** (see `vision-prompts.ts`):
- Observation guidelines
- Element location strategies
- Action selection logic
- Error handling approaches

**Teaching Mode Prompt**:
- Element detection instructions
- Output format specifications
- Coverage requirements

## Storage & Memory

### Data Structure

```typescript
interface PageMemory {
  url: string;              // Full URL
  urlHash: string;          // Hash for storage key
  domain: string;           // hostname
  elements: UIElement[];    // Detected elements
  screenshotHash: string;   // Layout verification
  viewport: {               // Viewport dimensions
    width: number;
    height: number;
  };
  lastUpdated: number;      // Timestamp
}

interface UIElement {
  id: number;                      // Sequential ID
  bbox: BoundingBox;               // Pixel coordinates
  normalizedBbox: BoundingBox;     // 0-1000 normalized
  autoDescription: string;         // AI-generated description
  userDescription?: string;        // User-provided label
  elementType?: string;            // button, input, link, etc.
  confidence: number;              // Detection confidence
  timestamp: number;               // When detected
}
```

### Storage API

```typescript
import { TeachingStorage } from '@src/background/teaching';

// Save memory
await TeachingStorage.savePageMemory(memory);

// Get memory by URL
const memory = await TeachingStorage.getPageMemory(url);

// Get all memories for domain
const memories = await TeachingStorage.getDomainMemories('example.com');

// Update element description
await TeachingStorage.updateElementDescription(url, elementId, 'new description');

// Get statistics
const stats = await TeachingStorage.getStats();
// { totalMemories: 42, totalElements: 350, bytesUsed: 125000 }
```

## Configuration

### Vision Config

```typescript
interface VisionConfig {
  provider: 'huggingface' | 'dashscope' | 'vllm' | 'custom';
  apiKey: string;
  baseUrl?: string;              // Required for vllm/custom
  modelName: string;
  maxRetries: number;            // Default: 3
  timeout: number;               // Milliseconds, default: 30000
}
```

### Screenshot Options

```typescript
interface ScreenshotOptions {
  quality: number;               // 0-100, default: 90
  format: 'png' | 'jpeg';       // Default: 'jpeg'
  fullPage: boolean;            // Default: false
  maxWidth?: number;            // Optional size limits
  maxHeight?: number;
}
```

## Usage Patterns

### Pattern 1: One-Shot Action

```typescript
// Capture, analyze, act
const screenshot = await visionService.captureScreenshot(tabId);
const response = await visionService.callVisionModel(
  screenshot,
  'Click the login button'
);

const boxes = GroundingParser.extractBoundingBoxes(response.text);
const center = GroundingParser.getBBoxCenter(boxes[0]);
await GroundingActions.clickAt(tabId, center);
```

### Pattern 2: Teaching Then Acting

```typescript
// Teach once
await teachingService.startTeaching(tabId, url);
await teachingService.annotateElement(tabId, 1, 'login button');
await teachingService.saveSession(tabId);

// Act many times (fast, no vision API calls)
const elements = await teachingService.getRememberedElements(url);
const loginButton = elements.find(e => e.userDescription === 'login button');
await GroundingActions.clickAt(tabId, GroundingParser.getBBoxCenter(loginButton.bbox));
```

### Pattern 3: Re-Learning on Layout Change

```typescript
// Get previous memory
const oldMemory = await TeachingStorage.getPageMemory(url);

// Detect new layout
const session = await teachingService.startTeaching(tabId, url);

// Match old with new
const matches = await teachingService.matchElements(
  session.detectedElements,
  oldMemory.elements
);

// Update locations automatically
for (const match of matches) {
  if (match.matched && match.similarity > 0.8) {
    // Element found in new location
  } else {
    // Element not found, re-teach needed
  }
}
```

## Best Practices

### 1. When to Use Teaching Mode
- **First visit** to a new site or page type
- **Low confidence** actions (retry failed clicks)
- **Complex layouts** with many similar elements
- **Frequently used** pages to speed up future interactions

### 2. Coordinate Precision
- Use **normalized coordinates** (0-1000) for storage
- Convert to **pixel coordinates** at action time
- Account for **viewport changes** (resize, zoom)
- Prefer **center points** of bounding boxes for clicks

### 3. Error Handling
- **Retry** with different coordinates if click fails
- **Re-detect** if element not found
- **Scroll** if element outside viewport
- **Fallback** to DOM-based actions if vision fails

### 4. Performance Optimization
- **Cache** screenshots when taking multiple actions
- **Batch** element detection in teaching mode
- **Limit** storage size (max memories per domain)
- **Compress** images before storing (if needed)

### 5. Privacy Considerations
- Screenshots contain **sensitive information**
- Use **local models** (vLLM) for maximum privacy
- **Clear storage** regularly
- **Encrypt** API keys in config

## Limitations & Future Work

### Current Limitations
- No full-page screenshot stitching (viewport only)
- No visual embeddings (CLIP integration pending)
- No confidence scoring from vision model
- Limited OCR for text-heavy pages
- No video/animation handling

### Planned Enhancements
- [ ] Full-page screenshot stitching
- [ ] CLIP embeddings for better matching
- [ ] Confidence scores from model responses
- [ ] OCR integration for text extraction
- [ ] Dynamic element tracking
- [ ] Gesture support (drag, swipe)
- [ ] Multi-modal input (voice + vision)
- [ ] Integration with existing Navigator agent

## Troubleshooting

### Issue: Screenshots are blank
**Solution**: Ensure tab is active and page is loaded before capturing

### Issue: API calls timing out
**Solution**: Increase `timeout` in VisionConfig or check network/API status

### Issue: Elements not matched after page reload
**Solution**: Re-run teaching mode or adjust IoU threshold for matching

### Issue: Clicks not working
**Solution**: Verify coordinates are within viewport bounds, check for overlays

### Issue: High storage usage
**Solution**: Use `TeachingStorage.clearAllMemories()` or limit memories per domain

## Contributing

To extend the vision system:

1. **New Provider**: Add to `VisionService` in `vision/service.ts`
2. **New Action**: Add schema to `vision-schemas.ts` and handler to `vision-builder.ts`
3. **New Grounding Format**: Extend parser in `grounding/parser.ts`
4. **Storage Backend**: Implement alternative to chrome.storage in `teaching/storage.ts`

## References

- [Qwen3-VL Model](https://github.com/QwenLM/Qwen3-VL)
- [Computer Use Cookbook](https://github.com/QwenLM/Qwen3-VL/blob/main/cookbooks/computer_use.ipynb)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)
- [Vision-Language Models Paper](https://arxiv.org/abs/2308.12966)
