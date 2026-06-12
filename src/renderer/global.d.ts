import type { UnseenApi } from '../preload/index';

declare global {
  interface Window {
    unseen: UnseenApi;
  }
}

export {};
