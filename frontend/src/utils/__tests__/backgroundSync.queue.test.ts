/**
 * Covers #1556: the IndexedDB queue functions (queueAction, getPendingActions,
 * getPendingCount, updateActionRetry, removeAction) round-trip against the
 * real `idb` calls, using fake-indexeddb in place of a browser database.
 */

import 'fake-indexeddb/auto';
import {
  getPendingActions,
  getPendingCount,
  queueAction,
  removeAction,
  updateActionRetry,
} from '../backgroundSync';

beforeEach(async () => {
  for (const action of await getPendingActions()) {
    await removeAction(action.id);
  }
});

describe('backgroundSync queue', () => {
  it('adds, lists, increments retries and removes an action', async () => {
    const id = await queueAction(
      'application',
      '/api/jobs/1/apply',
      'POST',
      { note: 'hi' },
      { Authorization: 'Bearer token' }
    );

    expect(await getPendingCount()).toBe(1);

    const [queued] = await getPendingActions();
    expect(queued).toMatchObject({
      id,
      type: 'application',
      endpoint: '/api/jobs/1/apply',
      method: 'POST',
      body: { note: 'hi' },
      headers: { Authorization: 'Bearer token' },
      retries: 0,
    });

    await updateActionRetry(id);
    await updateActionRetry(id);
    expect((await getPendingActions())[0].retries).toBe(2);

    await removeAction(id);
    expect(await getPendingCount()).toBe(0);
  });

  it('filters pending actions by type', async () => {
    await queueAction('application', '/api/jobs/1/apply', 'POST', {});
    const messageId = await queueAction('message', '/api/messages', 'POST', { text: 'hello' });

    const messages = await getPendingActions('message');

    expect(messages.map((action) => action.id)).toEqual([messageId]);
    expect(await getPendingActions()).toHaveLength(2);
  });

  it('ignores retry updates for an id that is not queued', async () => {
    await queueAction('message', '/api/messages', 'POST', {});

    await expect(updateActionRetry('missing-id')).resolves.toBeUndefined();

    expect(await getPendingCount()).toBe(1);
  });
});
