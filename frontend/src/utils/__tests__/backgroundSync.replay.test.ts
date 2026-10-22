/**
 * Covers #1616: replaying a queued action must not delete it on a 401/403
 * (an expired session), only on genuine client errors such as 400.
 */

import 'fake-indexeddb/auto';
import {
  getAuthRequiredCount,
  getPendingActions,
  queueAction,
  removeAction,
  replayPendingActions,
} from '../backgroundSync';
import { SYNC_AUTH_REQUIRED_EVENT } from '../syncEvents';

const fetchMock = jest.fn();

beforeEach(async () => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  for (const action of await getPendingActions()) {
    await removeAction(action.id);
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

function respondWith(status: number) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

async function queueMessage() {
  return queueAction('message', '/api/messages', 'POST', { text: 'hello' });
}

describe('replayPendingActions', () => {
  it.each([401, 403])('keeps an action refused with %s and marks it for re-login', async (status) => {
    const id = await queueMessage();
    respondWith(status);

    await replayPendingActions();

    const [kept] = await getPendingActions();
    expect(kept.id).toBe(id);
    expect(kept.authRequired).toBe(true);
    expect(await getAuthRequiredCount()).toBe(1);
  });

  it('tells the page when actions are waiting for re-login', async () => {
    await queueMessage();
    await queueMessage();
    respondWith(401);
    const listener = jest.fn();
    window.addEventListener(SYNC_AUTH_REQUIRED_EVENT, listener);

    await replayPendingActions();

    window.removeEventListener(SYNC_AUTH_REQUIRED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ count: 2 });
  });

  it('still removes an action refused with 400', async () => {
    await queueMessage();
    respondWith(400);

    await replayPendingActions();

    expect(await getPendingActions()).toEqual([]);
  });

  it('removes an action once it succeeds, including one that needed re-login', async () => {
    await queueMessage();
    respondWith(401);
    await replayPendingActions();

    respondWith(200);
    await replayPendingActions();

    expect(await getPendingActions()).toEqual([]);
    expect(await getAuthRequiredCount()).toBe(0);
  });

  it('keeps a server error queued with its retry count raised, without asking for re-login', async () => {
    await queueMessage();
    respondWith(503);
    const listener = jest.fn();
    window.addEventListener(SYNC_AUTH_REQUIRED_EVENT, listener);

    await replayPendingActions();

    window.removeEventListener(SYNC_AUTH_REQUIRED_EVENT, listener);
    const [kept] = await getPendingActions();
    expect(kept.retries).toBe(1);
    expect(kept.authRequired).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });
});
