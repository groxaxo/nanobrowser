# Vision System Examples

Reference examples for using the vision-first architecture.

## Files

- `vision-usage-example.ts` - Code examples showing vision system usage

## Quick Guide

### 1. Teaching Mode (First Visit)
```typescript
// Detect and learn all elements on a page
await teachPage(tabId, url);
```

### 2. Fast Mode (Subsequent Visits)
```typescript
// Use learned elements (no API calls)
await useLearnedElement(tabId, url);
```

## Documentation

See:
- [VISION-SYSTEM.md](../VISION-SYSTEM.md) - Complete API reference
- [VISION-INTEGRATION-GUIDE.md](../VISION-INTEGRATION-GUIDE.md) - Integration guide

## API Keys Required

Get keys from:
- HuggingFace: https://huggingface.co/settings/tokens
- DashScope: https://dashscope.console.aliyun.com/
- vLLM: Self-hosted (no key needed)
