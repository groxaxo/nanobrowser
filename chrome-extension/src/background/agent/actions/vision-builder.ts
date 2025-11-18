/**
 * Vision-based action builder
 * Builds coordinate-based actions for vision-first navigation
 */

import { ActionResult, type AgentContext } from '@src/background/agent/types';
import { Action } from './builder';
import {
  clickAtActionSchema,
  typeAtActionSchema,
  scrollDownActionSchema,
  scrollUpActionSchema,
  scrollToActionSchema,
  hoverAtActionSchema,
  goToUrlVisionSchema,
  goBackVisionSchema,
  newTabVisionSchema,
  closeTabVisionSchema,
  waitVisionSchema,
  doneVisionSchema,
  startTeachingSchema,
  annotateElementSchema,
  endTeachingSchema,
  clickRefActionSchema,
} from './vision-schemas';
import { z } from 'zod';
import { GroundingActions } from '@src/background/grounding/actions';
import { TeachingService } from '@src/background/teaching/service';
import { createLogger } from '@src/background/log';
import { Actors, ExecutionState } from '../event/types';
import type { VisionConfig } from '@src/background/vision/types';

const logger = createLogger('VisionActionBuilder');

export class VisionActionBuilder {
  private readonly context: AgentContext;
  private teachingService: TeachingService | null = null;

  constructor(context: AgentContext, visionConfig?: VisionConfig) {
    this.context = context;
    if (visionConfig) {
      this.teachingService = new TeachingService(visionConfig);
    }
  }

  buildVisionActions(): Action[] {
    const actions: Action[] = [];

    // Click at coordinates
    const clickAt = new Action(async (input: z.infer<typeof clickAtActionSchema.schema>) => {
      const intent = input.intent || `Clicking at (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await GroundingActions.clickAt(page.tabId, { x: input.x, y: input.y });

      const msg = `✓ Clicked at coordinates (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, clickAtActionSchema);
    actions.push(clickAt);

    // Type at coordinates
    const typeAt = new Action(async (input: z.infer<typeof typeAtActionSchema.schema>) => {
      const intent = input.intent || `Typing "${input.text}" at (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await GroundingActions.typeAt(page.tabId, { x: input.x, y: input.y }, input.text);

      const msg = `✓ Typed "${input.text}" at coordinates (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, typeAtActionSchema);
    actions.push(typeAt);

    // Scroll down
    const scrollDown = new Action(async (input: z.infer<typeof scrollDownActionSchema.schema>) => {
      const intent = input.intent || 'Scrolling down';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await GroundingActions.scrollDown(page.tabId);

      const msg = '✓ Scrolled down one viewport';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, scrollDownActionSchema);
    actions.push(scrollDown);

    // Scroll up
    const scrollUp = new Action(async (input: z.infer<typeof scrollUpActionSchema.schema>) => {
      const intent = input.intent || 'Scrolling up';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await GroundingActions.scrollUp(page.tabId);

      const msg = '✓ Scrolled up one viewport';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, scrollUpActionSchema);
    actions.push(scrollUp);

    // Scroll to coordinates
    const scrollTo = new Action(async (input: z.infer<typeof scrollToActionSchema.schema>) => {
      const intent = input.intent || `Scrolling to (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await GroundingActions.scrollTo(page.tabId, { x: input.x, y: input.y });

      const msg = `✓ Scrolled to coordinates (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, scrollToActionSchema);
    actions.push(scrollTo);

    // Hover at coordinates
    const hoverAt = new Action(async (input: z.infer<typeof hoverAtActionSchema.schema>) => {
      const intent = input.intent || `Hovering at (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await GroundingActions.hoverAt(page.tabId, { x: input.x, y: input.y });

      const msg = `✓ Hovered at coordinates (${input.x}, ${input.y})`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, hoverAtActionSchema);
    actions.push(hoverAt);

    // Go to URL
    const goToUrl = new Action(async (input: z.infer<typeof goToUrlVisionSchema.schema>) => {
      const intent = input.intent || `Navigating to ${input.url}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      await this.context.browserContext.navigateTo(input.url);

      const msg = `✓ Navigated to ${input.url}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, goToUrlVisionSchema);
    actions.push(goToUrl);

    // Go back
    const goBack = new Action(async (input: z.infer<typeof goBackVisionSchema.schema>) => {
      const intent = input.intent || 'Going back';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await page.goBack();

      const msg = '✓ Navigated back';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, goBackVisionSchema);
    actions.push(goBack);

    // New tab
    const newTab = new Action(async (input: z.infer<typeof newTabVisionSchema.schema>) => {
      const intent = input.intent || `Opening new tab${input.url ? ` with ${input.url}` : ''}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      await this.context.browserContext.openTab(input.url || 'about:blank');

      const msg = `✓ Opened new tab${input.url ? ` with ${input.url}` : ''}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, newTabVisionSchema);
    actions.push(newTab);

    // Close tab
    const closeTab = new Action(async (input: z.infer<typeof closeTabVisionSchema.schema>) => {
      const intent = input.intent || 'Closing current tab';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      const page = await this.context.browserContext.getCurrentPage();
      await this.context.browserContext.closeTab(page.tabId);

      const msg = '✓ Closed current tab';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, closeTabVisionSchema);
    actions.push(closeTab);

    // Wait
    const wait = new Action(async (input: z.infer<typeof waitVisionSchema.schema>) => {
      const intent = input.intent || `Waiting ${input.seconds} seconds`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

      await new Promise(resolve => setTimeout(resolve, input.seconds * 1000));

      const msg = `✓ Waited ${input.seconds} seconds`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
      return new ActionResult({ extractedContent: msg, includeInMemory: true });
    }, waitVisionSchema);
    actions.push(wait);

    // Done
    const done = new Action(async (input: z.infer<typeof doneVisionSchema.schema>) => {
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, 'Completing task');
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, input.text);
      return new ActionResult({
        isDone: true,
        extractedContent: input.text,
      });
    }, doneVisionSchema);
    actions.push(done);

    // Teaching mode actions (if teaching service is available)
    if (this.teachingService) {
      // Start teaching
      const startTeaching = new Action(async (input: z.infer<typeof startTeachingSchema.schema>) => {
        const intent = input.intent || 'Starting teaching mode';
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

        const page = await this.context.browserContext.getCurrentPage();
        const state = await page.getState();
        const session = await this.teachingService!.startTeaching(page.tabId, state.url);

        const msg = `✓ Teaching mode started. Detected ${session.detectedElements.length} interactive elements. Use annotate_element to label them.`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
      }, startTeachingSchema);
      actions.push(startTeaching);

      // Annotate element
      const annotateElement = new Action(async (input: z.infer<typeof annotateElementSchema.schema>) => {
        const intent = input.intent || `Annotating element ${input.element_id}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

        const page = await this.context.browserContext.getCurrentPage();
        await this.teachingService!.annotateElement(page.tabId, input.element_id, input.description);

        const msg = `✓ Annotated element ${input.element_id} as "${input.description}"`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
      }, annotateElementSchema);
      actions.push(annotateElement);

      // End teaching
      const endTeaching = new Action(async (input: z.infer<typeof endTeachingSchema.schema>) => {
        const intent = input.intent || 'Ending teaching mode';
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

        const page = await this.context.browserContext.getCurrentPage();

        if (input.save) {
          await this.teachingService!.saveSession(page.tabId);
        }

        await this.teachingService!.endTeaching(page.tabId);

        const msg = input.save ? '✓ Teaching mode ended and annotations saved' : '✓ Teaching mode ended without saving';
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
      }, endTeachingSchema);
      actions.push(endTeaching);

      // Click by reference
      const clickRef = new Action(async (input: z.infer<typeof clickRefActionSchema.schema>) => {
        const intent = input.intent || `Clicking on "${input.ref}"`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

        const page = await this.context.browserContext.getCurrentPage();
        const state = await page.getState();
        const elements = await this.teachingService!.getRememberedElements(state.url);

        // Find element by reference
        const element = elements.find(
          e =>
            e.userDescription?.toLowerCase().includes(input.ref.toLowerCase()) ||
            e.autoDescription.toLowerCase().includes(input.ref.toLowerCase()),
        );

        if (!element) {
          throw new Error(`Element "${input.ref}" not found. Try using teaching mode first.`);
        }

        // Get viewport dimensions to convert normalized coords to pixels
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: page.tabId },
          func: () => ({
            width: window.innerWidth,
            height: window.innerHeight,
          }),
        });

        const viewport = result.result;
        if (!viewport) {
          throw new Error('Failed to get viewport dimensions');
        }

        // Convert normalized bbox to pixel coordinates
        const centerX = Math.round(
          ((element.normalizedBbox.x1 + element.normalizedBbox.x2) / 2 / 1000) * viewport.width,
        );
        const centerY = Math.round(
          ((element.normalizedBbox.y1 + element.normalizedBbox.y2) / 2 / 1000) * viewport.height,
        );

        await GroundingActions.clickAt(page.tabId, { x: centerX, y: centerY });

        const msg = `✓ Clicked on "${input.ref}" at (${centerX}, ${centerY})`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
      }, clickRefActionSchema);
      actions.push(clickRef);
    }

    return actions;
  }
}
