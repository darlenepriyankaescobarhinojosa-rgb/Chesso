const fs = require('node:fs');
const path = require('node:path');

const empty = () => ({ users: [], sessions: {}, carts: {}, orders: [] });
const schema = `
  CREATE TABLE IF NOT EXISTS cheeso_users (id text PRIMARY KEY, payload jsonb NOT NULL);
  CREATE UNIQUE INDEX IF NOT EXISTS cheeso_users_email ON cheeso_users (lower(payload->>'email'));
  CREATE TABLE IF NOT EXISTS cheeso_sessions (token text PRIMARY KEY, user_id text NOT NULL REFERENCES cheeso_users(id));
  CREATE TABLE IF NOT EXISTS cheeso_carts (user_id text PRIMARY KEY REFERENCES cheeso_users(id), items jsonb NOT NULL);
  CREATE TABLE IF NOT EXISTS cheeso_orders (id text PRIMARY KEY, payload jsonb NOT NULL);
  CREATE UNIQUE INDEX IF NOT EXISTS cheeso_orders_submission ON cheeso_orders ((payload->>'submissionId'));
`;

class JsonDatabase {
  constructor(filename) { this.filename = filename; this.queue = Promise.resolve(); }
  transaction(operation) {
    const run = this.queue.then(async () => {
      fs.mkdirSync(path.dirname(this.filename), { recursive: true });
      if (!fs.existsSync(this.filename)) fs.writeFileSync(this.filename, JSON.stringify(empty(), null, 2));
      const before = fs.readFileSync(this.filename, 'utf8');
      const db = JSON.parse(before);
      const result = await operation(db);
      if (JSON.stringify(db) !== JSON.stringify(JSON.parse(before))) {
        fs.writeFileSync(`${this.filename}.tmp`, JSON.stringify(db, null, 2));
        fs.renameSync(`${this.filename}.tmp`, this.filename);
      }
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }
}

// Preserve the existing data shape and validation while storing each entity in
// its own PostgreSQL row. A transaction lock protects concurrent requests across
// Vercel instances, including checkout retries and email uniqueness checks.
class PostgresDatabase {
  constructor(connectionString, pool) {
    this.pool = pool || new (require('pg').Pool)({
      connectionString, max: 1, idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 10000, allowExitOnIdle: true
    });
    this.pool.on('error', () => console.error('CHEESO: conexión inactiva a PostgreSQL interrumpida.'));
    this.ready = null;
  }
  initialize() {
    if (!this.ready) this.ready = (async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SET LOCAL statement_timeout = '15000ms'");
        await client.query('SELECT pg_advisory_xact_lock(1128813391)');
        await client.query(schema);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally { client.release(); }
    })().catch(error => { this.ready = null; throw error; });
    return this.ready;
  }
  async transaction(operation) {
    await this.initialize();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '15000ms'");
      await client.query('SELECT pg_advisory_xact_lock(1128813391)');
      const users = await client.query('SELECT payload FROM cheeso_users ORDER BY id');
      const sessions = await client.query('SELECT token, user_id FROM cheeso_sessions');
      const carts = await client.query('SELECT user_id, items FROM cheeso_carts');
      const orders = await client.query('SELECT payload FROM cheeso_orders ORDER BY id');
      const db = {
        users: users.rows.map(row => row.payload),
        sessions: Object.fromEntries(sessions.rows.map(row => [row.token, row.user_id])),
        carts: Object.fromEntries(carts.rows.map(row => [row.user_id, row.items])),
        orders: orders.rows.map(row => row.payload)
      };
      const before = structuredClone(db);
      const result = await operation(db);
      for (const [table, key] of [['cheeso_users', 'users'], ['cheeso_orders', 'orders']]) {
        const previous = new Map(before[key].map(item => [item.id, JSON.stringify(item)]));
        for (const item of db[key]) {
          if (previous.get(item.id) !== JSON.stringify(item)) {
            await client.query(`INSERT INTO ${table} (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`, [item.id, JSON.stringify(item)]);
          }
        }
      }
      for (const [userId, items] of Object.entries(db.carts)) {
        if (JSON.stringify(before.carts[userId]) !== JSON.stringify(items)) {
          await client.query('INSERT INTO cheeso_carts (user_id, items) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items', [userId, JSON.stringify(items)]);
        }
      }
      for (const [token, userId] of Object.entries(db.sessions)) {
        if (before.sessions[token] !== userId) await client.query('INSERT INTO cheeso_sessions (token, user_id) VALUES ($1, $2) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id', [token, userId]);
      }
      for (const token of Object.keys(before.sessions)) {
        if (!Object.hasOwn(db.sessions, token)) await client.query('DELETE FROM cheeso_sessions WHERE token = $1', [token]);
      }
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }
  close() { return this.pool.end(); }
}

let database;
function getDatabase() {
  if (database) return database;
  if (process.env.DATABASE_URL) database = new PostgresDatabase(process.env.DATABASE_URL);
  else {
    if (process.env.VERCEL) {
      const error = new Error('Configura DATABASE_URL de Neon antes de recibir pedidos.');
      error.status = 503;
      throw error;
    }
    database = new JsonDatabase(process.env.CHEESO_DB_PATH ? path.resolve(process.env.CHEESO_DB_PATH) : path.join(__dirname, 'data', 'db.json'));
  }
  return database;
}
module.exports = { getDatabase, PostgresDatabase, JsonDatabase };
