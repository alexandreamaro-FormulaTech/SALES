import "server-only";

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { SCHEMA_VERSION } from "./ids";
import { createSeed, defaultContractStatuses } from "./seed";
import { supabaseConfigured } from "./supabase/server";
import { loadSupabaseDb, saveSupabaseDb } from "./supabase/store";
import type { DB, DomainResult } from "./types";

const FILE = path.join(process.cwd(), "data", "db.json");

type Store = { cache: DB | null; queue: Promise<void> };

const globalStore = globalThis as typeof globalThis & { __formula360?: Store };

function store(): Store {
  if (!globalStore.__formula360) {
    globalStore.__formula360 = { cache: null, queue: Promise.resolve() };
  }
  return globalStore.__formula360;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const current = store();
  const run = current.queue.then(task);
  current.queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function persist(db: DB) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const temp = `${FILE}.tmp`;
  await writeFile(temp, JSON.stringify(db));
  await rename(temp, FILE);
}

async function load(): Promise<DB> {
  const current = store();
  if (current.cache) return current.cache;
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as DB;
    if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error("schema");
    if (!parsed.contractStatuses?.length) {
      parsed.contractStatuses = defaultContractStatuses(parsed.organization.id);
      current.cache = parsed;
      await persist(parsed);
      return parsed;
    }
    current.cache = parsed;
    return parsed;
  } catch {
    const seeded = createSeed();
    current.cache = seeded;
    await persist(seeded);
    return seeded;
  }
}

export function getDb(): Promise<DB> {
  if (supabaseConfigured()) return loadSupabaseDb();
  return enqueue(() => load());
}

export function commit<T>(mutator: (db: DB) => { db: DB; result: DomainResult<T> }): Promise<DomainResult<T>> {
  return enqueue(async () => {
    if (supabaseConfigured()) {
      const current = await loadSupabaseDb();
      const { db, result } = mutator(current);
      if (result.ok && db !== current) await saveSupabaseDb(current, db);
      return result;
    }
    const current = await load();
    const { db, result } = mutator(current);
    if (result.ok && db !== current) {
      store().cache = db;
      await persist(db);
    }
    return result;
  });
}

export function replaceDb(db: DB): Promise<void> {
  return enqueue(async () => {
    if (supabaseConfigured()) {
      const current = await loadSupabaseDb();
      await saveSupabaseDb(current, db);
      return;
    }
    store().cache = db;
    await persist(db);
  });
}
