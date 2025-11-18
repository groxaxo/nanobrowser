/**
 * Vision System Usage Examples
 * Reference examples for using the vision-first architecture
 */

// Example 1: Basic Setup
async function setupVisionSystem() {
  const config = {
    provider: 'huggingface',
    apiKey: 'hf_xxxxx', // Replace with your key
    modelName: 'Qwen/Qwen2-VL-72B-Instruct',
    maxRetries: 3,
    timeout: 30000,
  };

  // Initialize vision service
  console.log('Vision system ready');
}

// Example 2: Click Search Button
async function clickSearchButton(tabId) {
  // 1. Capture screenshot
  // 2. Find button using vision model
  // 3. Parse coordinates
  // 4. Click
  console.log('Search button clicked');
}

// Example 3: Teaching Mode
async function teachPage(tabId, url) {
  // 1. Start teaching mode
  // 2. Detect all elements
  // 3. User annotates important ones
  // 4. Save to storage
  console.log('Page taught');
}

// Example 4: Use Learned Elements (Fast!)
async function useLearnedElement(tabId, url) {
  // 1. Retrieve from storage (no API call)
  // 2. Convert normalized coords to pixels
  // 3. Click
  console.log('Clicked using memory - 0ms latency!');
}

export { setupVisionSystem, clickSearchButton, teachPage, useLearnedElement };
