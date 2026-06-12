import type { SottoApi } from '../preload/index';

declare global {
  interface Window {
    sotto: SottoApi;
  }
}

export {};
