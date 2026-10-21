/**
 * Covers #1619: unregisterServiceWorker must not touch `navigator` on the
 * server.
 *
 * jsdom always defines a non-configurable `window`, and jest.setup.ts needs
 * one, so the server is simulated instead: the module's real source is
 * compiled and run in a fresh Node context that has neither `window` nor
 * `navigator`, exactly as during SSR.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createContext, runInContext } from 'vm';
import ts from 'typescript';

function loadOnServer() {
  const source = readFileSync(join(__dirname, '..', 'registerServiceWorker.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} as Record<string, () => unknown> };
  runInContext(outputText, createContext({ module, exports: module.exports, process, console }));
  return module.exports;
}

describe('unregisterServiceWorker during SSR', () => {
  it('runs in a context with no window or navigator', () => {
    const context = createContext({});
    expect(runInContext('typeof window + typeof navigator', context)).toBe('undefinedundefined');
  });

  it('does not throw', () => {
    const { unregisterServiceWorker } = loadOnServer();
    expect(() => unregisterServiceWorker()).not.toThrow();
  });
});
