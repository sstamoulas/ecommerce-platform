const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

const { Pool } = require("pg");

const sqlDir = join(process.cwd(), "db", "postgres");

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to bootstrap Postgres.");
  }

  return databaseUrl;
}

function getSslConfig() {
  return process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined;
}

async function runSqlFile(pool, fileName) {
  const sql = await readFile(join(sqlDir, fileName), "utf8");
  await pool.query(sql);
}

async function syncOrderNumberSequence(pool) {
  const { rows } = await pool.query(
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

async function main() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: getSslConfig(),
    max: 1,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

  try {
    await runSqlFile(pool, "schema.sql");
    await runSqlFile(pool, "seed.sql");
    await syncOrderNumberSequence(pool);
    console.log("Postgres bootstrap complete.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
