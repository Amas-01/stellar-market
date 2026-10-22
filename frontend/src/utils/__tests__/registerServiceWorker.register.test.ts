/**
 * Covers #1557: registerServiceWorker only registers in production, and a
 * failed registration is logged rather than thrown.
 */

import { registerServiceWorker } from '../registerServiceWorker';

const originalNodeEnv = process.env.NODE_ENV;

function mockServiceWorker(register: jest.Mock) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  });
}

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  jest.restoreAllMocks();
});

describe('registerServiceWorker', () => {
  it.each(['development', 'test'])('is a no-op when NODE_ENV is %s', async (nodeEnv) => {
    process.env.NODE_ENV = nodeEnv;
    const register = jest.fn();
    mockServiceWorker(register);

    await expect(registerServiceWorker()).resolves.toBeUndefined();

    expect(register).not.toHaveBeenCalled();
  });

  it('is a no-op when service workers are unsupported', async () => {
    process.env.NODE_ENV = 'production';

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('registers /sw.js at the root scope in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const registration = { addEventListener: jest.fn() };
    const register = jest.fn().mockResolvedValue(registration);
    mockServiceWorker(register);

    await expect(registerServiceWorker()).resolves.toBe(registration);

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('logs and swallows a registration failure in production', async () => {
    process.env.NODE_ENV = 'production';
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('registration refused');
    mockServiceWorker(jest.fn().mockRejectedValue(failure));

    await expect(registerServiceWorker()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith('Service Worker registration failed:', failure);
  });
});
