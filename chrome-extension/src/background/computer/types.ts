/**
 * Types for Computer-Using Agent (CUA) abstraction
 * Provides OS-level computer control beyond browser automation
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ScreenSize {
  width: number;
  height: number;
}

export type MouseButton = 'left' | 'right' | 'middle';
export type KeyModifier = 'ctrl' | 'shift' | 'alt' | 'meta';

/**
 * Computer action types that can be performed
 */
export enum ComputerActionType {
  SCREENSHOT = 'screenshot',
  CLICK = 'click',
  DOUBLE_CLICK = 'double_click',
  RIGHT_CLICK = 'right_click',
  MOUSE_MOVE = 'mouse_move',
  DRAG = 'drag',
  TYPE = 'type',
  KEY_PRESS = 'key_press',
  SCROLL = 'scroll',
  WAIT = 'wait',
  GET_SCREEN_SIZE = 'get_screen_size',
}

/**
 * Base interface for all computer actions
 */
export interface ComputerAction {
  type: ComputerActionType;
  coordinates?: Point;
}

export interface ScreenshotAction extends ComputerAction {
  type: ComputerActionType.SCREENSHOT;
  fullScreen?: boolean;
}

export interface ClickAction extends ComputerAction {
  type: ComputerActionType.CLICK | ComputerActionType.DOUBLE_CLICK | ComputerActionType.RIGHT_CLICK;
  coordinates: Point;
  button?: MouseButton;
  modifiers?: KeyModifier[];
}

export interface MouseMoveAction extends ComputerAction {
  type: ComputerActionType.MOUSE_MOVE;
  coordinates: Point;
}

export interface DragAction extends ComputerAction {
  type: ComputerActionType.DRAG;
  from: Point;
  to: Point;
}

export interface TypeAction extends ComputerAction {
  type: ComputerActionType.TYPE;
  text: string;
  coordinates?: Point; // Optional: focus at coordinates first
}

export interface KeyPressAction extends ComputerAction {
  type: ComputerActionType.KEY_PRESS;
  keys: string[];
  modifiers?: KeyModifier[];
}

export interface ScrollAction extends ComputerAction {
  type: ComputerActionType.SCROLL;
  coordinates?: Point;
  deltaX: number;
  deltaY: number;
}

export interface WaitAction extends ComputerAction {
  type: ComputerActionType.WAIT;
  milliseconds: number;
}

export interface GetScreenSizeAction extends ComputerAction {
  type: ComputerActionType.GET_SCREEN_SIZE;
}

/**
 * Union type of all computer actions
 */
export type AnyComputerAction =
  | ScreenshotAction
  | ClickAction
  | MouseMoveAction
  | DragAction
  | TypeAction
  | KeyPressAction
  | ScrollAction
  | WaitAction
  | GetScreenSizeAction;

/**
 * Result of a computer action
 */
export interface ComputerActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Computer interface mode
 */
export enum ComputerMode {
  BROWSER_ONLY = 'browser_only', // Only browser automation (current)
  DESKTOP = 'desktop', // OS-level desktop automation
  HYBRID = 'hybrid', // Both browser and desktop
}

/**
 * Configuration for computer interface
 */
export interface ComputerConfig {
  mode: ComputerMode;
  enableNativeMessaging?: boolean; // For OS-level control
  platform?: 'windows' | 'linux' | 'macos';
  sandbox?: boolean; // Safety: restrict certain actions
  messageTimeout?: number; // Timeout for native messages in ms (default: 30000)
}

/**
 * Computer interface provider
 * Abstract interface that can be implemented for different platforms
 */
export interface IComputerProvider {
  /**
   * Initialize the computer interface
   */
  initialize(): Promise<void>;

  /**
   * Execute a computer action
   */
  execute(action: AnyComputerAction): Promise<ComputerActionResult>;

  /**
   * Capture screenshot
   */
  screenshot(fullScreen?: boolean): Promise<string>;

  /**
   * Get screen dimensions
   */
  getScreenSize(): Promise<ScreenSize>;

  /**
   * Click at coordinates
   */
  click(point: Point, button?: MouseButton, modifiers?: KeyModifier[]): Promise<void>;

  /**
   * Move mouse to coordinates
   */
  mouseMove(point: Point): Promise<void>;

  /**
   * Type text
   */
  type(text: string, coordinates?: Point): Promise<void>;

  /**
   * Press keys with modifiers
   */
  keyPress(keys: string[], modifiers?: KeyModifier[]): Promise<void>;

  /**
   * Scroll at coordinates
   */
  scroll(deltaX: number, deltaY: number, coordinates?: Point): Promise<void>;

  /**
   * Drag from one point to another
   */
  drag(from: Point, to: Point): Promise<void>;

  /**
   * Wait for specified time
   */
  wait(milliseconds: number): Promise<void>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}

/**
 * Computer use agent context
 */
export interface ComputerContext {
  provider: IComputerProvider;
  config: ComputerConfig;
  screenSize?: ScreenSize;
}
