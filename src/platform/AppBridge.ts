export type AppBridge = {
  requestExit: () => void;
};

declare global {
  interface Window {
    appBridge?: AppBridge;
  }
}
