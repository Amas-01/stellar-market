/**
 * Covers #1619: the SSR guard on unregisterServiceWorker leaves browser
 * behaviour unchanged.
 */

import { unregisterServiceWorker } from '../registerServiceWorker';

describe('unregisterServiceWorker in the browser', () => {
  afterEach(() => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  });

  it('unregisters the active service worker', async () => {
    const unregister = jest.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ unregister }) },
    });

    unregisterServiceWorker();
    await Promise.resolve();

    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('does nothing when service workers are unsupported', () => {
    expect('serviceWorker' in navigator).toBe(false);
    expect(() => unregisterServiceWorker()).not.toThrow();
  });
});
