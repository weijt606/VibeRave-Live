import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

function emptyRecord(id) {
  const now = new Date().toISOString();
  return { id, createdAt: now, updatedAt: now, messages: [] };
}

/**
 * File-backed implementation of the SessionStore port. Each session
 * lives in `<dir>/<id>.json`. Writes go through a temp file + rename
 * so a crash mid-write doesn't leave a half-written record.
 *
 * @param {{ dir: string }} args
 * @returns {import('../application/ports.mjs').SessionStore}
 */
export function createFileSessionStore({ dir }) {
  const base = resolve(dir);
  const ready = mkdir(base, { recursive: true });
  // Never crash the process from here: a bad dir surfaces on the first call.
  ready.catch(() => {});
  const pathFor = (id) => join(base, `${id}.json`);

  // An unreadable record (torn disk write, hand edit, a directory in its
  // place) must not fail every later turn of that session — the booth keeps
  // a sessionId for a long time. Move it aside and start the session fresh.
  async function quarantine(id, err) {
    console.warn(`[sessions] ${id}.json unreadable (${err.message}) — moved aside, starting fresh`);
    await rename(pathFor(id), `${pathFor(id)}.corrupt.${Date.now()}`).catch(() => {});
    return emptyRecord(id);
  }

  return {
    async load(id) {
      await ready;
      let raw;
      try {
        raw = await readFile(pathFor(id), 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') return emptyRecord(id);
        return quarantine(id, err);
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        return quarantine(id, err);
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return quarantine(id, new Error('not a session record'));
      }
      parsed.id = id;
      parsed.messages = (Array.isArray(parsed.messages) ? parsed.messages : []).filter(
        (m) => m && typeof m === 'object',
      );
      return parsed;
    },

    async save(record) {
      await ready;
      record.updatedAt = new Date().toISOString();
      const target = pathFor(record.id);
      const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
      await writeFile(tmp, JSON.stringify(record, null, 2));
      await rename(tmp, target);
    },

    async clear(id) {
      await ready;
      try {
        await unlink(pathFor(id));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    },
  };
}
