// Cloud sync for per-user data (Tamil text, notes, favorites, highlights, read marks).
// Local-first: the app always works from localStorage; when signed in, changes are
// pushed to Supabase (table public.user_data, protected by row level security).
import { createClient } from '@supabase/supabase-js';

export const LIBS = ['med', 'enc'];
export const KINDS = ['ta', 'notes', 'fav', 'hl', 'read', 'ndate'];

const url = import.meta.env?.VITE_SUPABASE_URL;
const anon = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const enabled = Boolean(url && anon);

let sb = null, user = null, timer = null, busy = false, lastPull = 0;
let cb = { onUser() {}, onStatus() {}, onChange() {}, onRecovery() {} };

const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
const kk = (lib, kind) => `${lib}:${kind}`;
const readLocal = (lib, kind) => { try { return JSON.parse(ls.get(kk(lib, kind)) || '{}') || {}; } catch { return {}; } };
const isEmpty = (v) => !v || Object.keys(v).length === 0;
const status = (t) => cb.onStatus(t);

export function markDirty(lib, kind) {
  if (!LIBS.includes(lib) || !KINDS.includes(kind)) return;
  ls.set('sync:dirty:' + kk(lib, kind), '1');
  schedule();
}

function schedule() {
  if (!user) return;
  clearTimeout(timer);
  status('Saving…');
  timer = setTimeout(() => { push(); }, 1200);
}

// Merge used only when this device and the server both changed. Local wins on conflicts,
// favorites are unioned so nothing is lost.
export function merge(kind, local, server) {
  const out = {};
  for (const key of new Set([...Object.keys(server), ...Object.keys(local)])) {
    const inL = key in local, inS = key in server;
    if (inL && !inS) out[key] = local[key];
    else if (inS && !inL) out[key] = server[key];
    else if (kind === 'fav' && Array.isArray(local[key]) && Array.isArray(server[key])) out[key] = [...new Set([...server[key], ...local[key]])];
    else out[key] = local[key];
  }
  return out;
}

export async function push() {
  if (!user || !sb || busy) return;
  busy = true;
  try {
    for (const lib of LIBS) for (const kind of KINDS) {
      const key = kk(lib, kind);
      if (ls.get('sync:dirty:' + key) !== '1') continue;
      const value = readLocal(lib, kind);
      const { data, error } = await sb.from('user_data')
        .upsert({ user_id: user.id, lib, kind, value }, { onConflict: 'user_id,lib,kind' })
        .select('updated_at').single();
      if (error) throw error;
      ls.set('sync:base:' + key, data.updated_at);
      ls.del('sync:dirty:' + key);
    }
    status('Synced');
  } catch (e) {
    status('Sync problem, will retry');
    setTimeout(() => { if (user) push(); }, 15000);
  } finally { busy = false; }
}

export async function pull() {
  if (!user || !sb) return;
  lastPull = Date.now();
  status('Syncing…');
  const { data, error } = await sb.from('user_data').select('lib,kind,value,updated_at');
  if (error) { status('Sync problem, will retry'); return; }
  const rows = {};
  (data || []).forEach((r) => { rows[kk(r.lib, r.kind)] = r; });
  let changed = false;
  for (const lib of LIBS) for (const kind of KINDS) {
    const key = kk(lib, kind), row = rows[key];
    const local = readLocal(lib, kind), base = ls.get('sync:base:' + key);
    let dirty = ls.get('sync:dirty:' + key) === '1';
    if (!row) { if (!isEmpty(local)) ls.set('sync:dirty:' + key, '1'); continue; }
    if (row.updated_at === base) continue;               // server unchanged since our last sync
    if (!base && !isEmpty(local)) dirty = true;           // first sign-in on a device that already has data
    if (!dirty) ls.set(key, JSON.stringify(row.value));
    else { ls.set(key, JSON.stringify(merge(kind, local, row.value || {}))); ls.set('sync:dirty:' + key, '1'); }
    ls.set('sync:base:' + key, row.updated_at);
    changed = true;
  }
  if (changed) cb.onChange();
  await push();
}

function setUser(u) {
  const was = user && user.id;
  user = u || null;
  cb.onUser(user);
  if (user && user.id !== was) pull();
  if (!user) status('');
}

export async function init(opts = {}) {
  cb = { ...cb, ...opts };
  sb = opts.client || (enabled ? createClient(url, anon) : null);
  user = null;
  if (!sb) { status(''); return; }
  const { data } = await sb.auth.getSession();
  setUser(data?.session?.user);
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') cb.onRecovery();
    setUser(session?.user);
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && user && Date.now() - lastPull > 20000) pull();
    });
  }
}

export const signIn = (email, password) => sb.auth.signInWithPassword({ email, password });
export const signUp = (email, password) => sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
export const magicLink = (email) => sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
export const resetPassword = (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
export const updatePassword = (password) => sb.auth.updateUser({ password });
export async function signOut(clearLocal = false) {
  if (sb) await sb.auth.signOut();
  if (clearLocal) {
    try {
      Object.keys(localStorage).filter((k) => /^(med|enc|sync|app):/.test(k)).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    location.reload();
  }
}
export const currentUser = () => user;
