import test from 'node:test';
import assert from 'node:assert/strict';

// minimal localStorage shim so sync.js can run under Node; each "device" gets its own store
const makeStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), get _m() { return m; } }; };
globalThis.localStorage = makeStore();
globalThis.location = { origin: 'http://localhost' };

const Sync = await import('../src/sync.js');

function fakeServer() {
  const rows = new Map(); let t = 0;
  return {
    rows,
    client(userId) {
      return {
        auth: {
          getSession: async () => ({ data: { session: { user: { id: userId, email: 'a@b.c' } } } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signOut: async () => {},
        },
        from: () => ({
          select: async () => ({ data: [...rows.values()].filter((r) => r.user_id === userId), error: null }),
          upsert: (row) => {
            const stamp = new Date(1_700_000_000_000 + ++t * 1000).toISOString();
            rows.set(`${row.user_id}:${row.lib}:${row.kind}`, { ...row, updated_at: stamp });
            return { select: () => ({ single: async () => ({ data: { updated_at: stamp }, error: null }) }) };
          },
        }),
      };
    },
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function device(server, userId, setup) {
  globalThis.localStorage = makeStore();
  if (setup) setup(globalThis.localStorage);
  let changed = 0;
  await Sync.init({ client: server.client(userId), onChange: () => { changed++; } });
  await wait(30);
  await Sync.push();
  return { ls: globalThis.localStorage, get changed() { return changed; } };
}

test('existing local data is uploaded at first sign-in', async () => {
  const s = fakeServer();
  await device(s, 'u1', (ls) => ls.setItem('med:notes', JSON.stringify({ '2.5': 'hello' })));
  assert.deepEqual(s.rows.get('u1:med:notes').value, { '2.5': 'hello' });
});

test('a second device downloads the data', async () => {
  const s = fakeServer();
  await device(s, 'u1', (ls) => { ls.setItem('enc:ta', JSON.stringify({ c1: 'தமிழ்' })); });
  const d2 = await device(s, 'u1');
  assert.deepEqual(JSON.parse(d2.ls.getItem('enc:ta')), { c1: 'தமிழ்' });
  assert.ok(d2.changed >= 1);
});

test('users never see each other\'s rows', async () => {
  const s = fakeServer();
  await device(s, 'u1', (ls) => ls.setItem('med:fav', JSON.stringify({ T1: ['2.5'] })));
  const other = await device(s, 'u2');
  assert.equal(other.ls.getItem('med:fav'), null);
});

test('favorites from two devices are merged without loss', async () => {
  const s = fakeServer();
  await device(s, 'u1', (ls) => ls.setItem('med:fav', JSON.stringify({ T1: ['2.5'] })));
  const d2 = await device(s, 'u1', (ls) => ls.setItem('med:fav', JSON.stringify({ T1: ['3.4'], T2: ['2.1'] })));
  const merged = JSON.parse(d2.ls.getItem('med:fav'));
  assert.deepEqual(merged.T1.sort(), ['2.5', '3.4']);
  assert.deepEqual(merged.T2, ['2.1']);
  assert.deepEqual(s.rows.get('u1:med:fav').value.T1.sort(), ['2.5', '3.4']);
});

test('a deleted note stays deleted after the next sync', async () => {
  const s = fakeServer();
  const d1 = await device(s, 'u1', (ls) => ls.setItem('med:notes', JSON.stringify({ '2.5': 'a', '3.1': 'b' })));
  // delete one note on this device and push
  d1.ls.setItem('med:notes', JSON.stringify({ '3.1': 'b' }));
  Sync.markDirty('med', 'notes');
  await Sync.push();
  await Sync.pull();
  assert.deepEqual(JSON.parse(d1.ls.getItem('med:notes')), { '3.1': 'b' });
  assert.deepEqual(s.rows.get('u1:med:notes').value, { '3.1': 'b' });
});

test('merge keeps local value on conflict', () => {
  assert.deepEqual(Sync.merge('notes', { a: 'L' }, { a: 'S', b: 'S2' }), { a: 'L', b: 'S2' });
});
