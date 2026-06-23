export type KeyboardBlocker = {
  start(): Promise<void>;
  stop(): Promise<void>;
};
