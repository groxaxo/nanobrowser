/**
 * Vision-based action schemas for coordinate-based interactions
 */

import { z } from 'zod';

export interface ActionSchema {
  name: string;
  description: string;
  schema: z.ZodType;
}

// Click at specific coordinates
export const clickAtActionSchema: ActionSchema = {
  name: 'click_at',
  description: 'Click at specific pixel coordinates on the screen',
  schema: z.object({
    x: z.number().describe('X coordinate in pixels'),
    y: z.number().describe('Y coordinate in pixels'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Type text at coordinates
export const typeAtActionSchema: ActionSchema = {
  name: 'type_at',
  description: 'Type text at specific coordinates (focuses element first)',
  schema: z.object({
    x: z.number().describe('X coordinate in pixels'),
    y: z.number().describe('Y coordinate in pixels'),
    text: z.string().describe('Text to type'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Scroll actions
export const scrollDownActionSchema: ActionSchema = {
  name: 'scroll_down',
  description: 'Scroll down by one viewport height',
  schema: z.object({
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

export const scrollUpActionSchema: ActionSchema = {
  name: 'scroll_up',
  description: 'Scroll up by one viewport height',
  schema: z.object({
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

export const scrollToActionSchema: ActionSchema = {
  name: 'scroll_to',
  description: 'Scroll to specific coordinates',
  schema: z.object({
    x: z.number().describe('X coordinate in pixels'),
    y: z.number().describe('Y coordinate in pixels'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Hover action
export const hoverAtActionSchema: ActionSchema = {
  name: 'hover_at',
  description: 'Hover over specific coordinates',
  schema: z.object({
    x: z.number().describe('X coordinate in pixels'),
    y: z.number().describe('Y coordinate in pixels'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Navigation actions (these remain the same)
export const goToUrlVisionSchema: ActionSchema = {
  name: 'go_to_url',
  description: 'Navigate to a specific URL',
  schema: z.object({
    url: z.string().describe('URL to navigate to'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

export const goBackVisionSchema: ActionSchema = {
  name: 'go_back',
  description: 'Go back to the previous page',
  schema: z.object({
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Tab management
export const newTabVisionSchema: ActionSchema = {
  name: 'new_tab',
  description: 'Open a new tab with optional URL',
  schema: z.object({
    url: z.string().optional().describe('URL to open in new tab'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

export const closeTabVisionSchema: ActionSchema = {
  name: 'close_tab',
  description: 'Close the current tab',
  schema: z.object({
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Wait action
export const waitVisionSchema: ActionSchema = {
  name: 'wait',
  description: 'Wait for a specified number of seconds',
  schema: z.object({
    seconds: z.number().min(1).max(30).describe('Number of seconds to wait'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Done action
export const doneVisionSchema: ActionSchema = {
  name: 'done',
  description: 'Mark the task as complete with final result',
  schema: z.object({
    text: z.string().describe('Final result or summary of the completed task'),
  }),
};

// Teaching mode actions
export const startTeachingSchema: ActionSchema = {
  name: 'start_teaching',
  description: 'Start teaching mode to annotate UI elements on the current page',
  schema: z.object({
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

export const annotateElementSchema: ActionSchema = {
  name: 'annotate_element',
  description: 'Annotate a detected element with a user-friendly description',
  schema: z.object({
    element_id: z.number().describe('ID of the element to annotate (from teaching mode)'),
    description: z.string().describe('User-friendly description of the element'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

export const endTeachingSchema: ActionSchema = {
  name: 'end_teaching',
  description: 'End teaching mode and save annotations',
  schema: z.object({
    save: z.boolean().default(true).describe('Whether to save the annotations'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};

// Grounded action using references
export const clickRefActionSchema: ActionSchema = {
  name: 'click_ref',
  description: 'Click on an element by its reference name (from teaching mode or previous detections)',
  schema: z.object({
    ref: z.string().describe('Reference name of the element (e.g., "search box", "login button")'),
    intent: z.string().optional().describe('What you intend to do with this action'),
  }),
};
