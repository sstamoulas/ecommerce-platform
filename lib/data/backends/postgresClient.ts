import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Pool } from "pg";

type PostgresGlobals = {
  pool?: Pool;
  initPromise?: Promise<void>;
};

const globalForPostgres = globalThis as typeof globalThis & PostgresGlobals;
const POSTGRES_SQL_DIR = join(process.cwd(), "db", "postgres");

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when using the postgres backend.");
  }

  return databaseUrl;
}

function getSslConfig() {
  if (process.env.POSTGRES_SSL === "true") {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

export function getPostgresPool() {
  if (!globalForPostgres.pool) {
    globalForPostgres.pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: getSslConfig(),
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return globalForPostgres.pool;
}

export async function ensurePostgresReady() {
  if (!isAutoBootstrapEnabled()) {
    getPostgresPool();
    return;
  }

  if (!globalForPostgres.initPromise) {
    globalForPostgres.initPromise = initializePostgres().catch((error) => {
      globalForPostgres.initPromise = undefined;
      throw error;
    });
  }

  return globalForPostgres.initPromise;
}

async function initializePostgres() {
  const pool = getPostgresPool();
  await createSchema(pool);
  await seedDataIfNeeded(pool);
  await syncOrderNumberSequence(pool);
}

async function createSchema(pool: Pool) {
  await runSqlFile(pool, "schema.sql");
}

async function seedDataIfNeeded(pool: Pool) {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM products");
  if (Number(rows[0]?.count ?? "0") > 0) {
    return;
  }

  await runSqlFile(pool, "seed.sql");
}

async function runSqlFile(pool: Pool, fileName: string) {
  const sql = await readFile(join(POSTGRES_SQL_DIR, fileName), "utf8");
  await pool.query(sql);
}

function isAutoBootstrapEnabled() {
  const configured = process.env.POSTGRES_AUTO_BOOTSTRAP?.trim().toLowerCase();

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

async function syncOrderNumberSequence(pool: Pool) {
  const { rows } = await pool.query<{ max_order_number: number | null }>(
    `SELECT
      COALESCE(
        MAX(NULLIF(REGEXP_REPLACE(order_number, '\\D', '', 'g'), '')::integer),
        1051
      ) AS max_order_number
     FROM orders`
  );

  const nextValue = Number(rows[0]?.max_order_number ?? 1051) + 1;
  await pool.query(`SELECT setval('order_number_seq', $1, false)`, [nextValue]);
}
