const fs = require('node:fs');
const path = require('node:path');
const { PostgresDatabase } = require('../Backend_chesso/database');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env.local antes de migrar.');
  const filename = process.env.CHEESO_DB_PATH ? path.resolve(process.env.CHEESO_DB_PATH) : path.resolve(__dirname, '../Backend_chesso/data/db.json');
  const source = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : { users: [], sessions: {}, carts: {}, orders: [] };
  if (!Array.isArray(source.users) || !Array.isArray(source.orders) || !source.carts || !source.sessions) throw new Error('El archivo local no tiene el formato esperado.');
  const database = new PostgresDatabase(process.env.DATABASE_URL);
  try {
    const result = await database.transaction(db => {
      const added = { users: 0, orders: 0 };
      for (const key of ['users', 'orders']) {
        for (const record of source[key]) {
          const existing = db[key].find(item => item.id === record.id || (key === 'orders' && record.submissionId && item.submissionId === record.submissionId));
          if (existing) {
            if (JSON.stringify(existing) !== JSON.stringify(record) && !(key === 'orders' && record.fingerprint && existing.fingerprint === record.fingerprint)) {
              // JSONB key order is not stable; compare values recursively.
              const { isDeepStrictEqual } = require('node:util');
              if (!isDeepStrictEqual(existing, record)) throw new Error(`Conflicto de migración en ${key}; no se sobrescribieron datos.`);
            }
          } else { db[key].push(record); added[key]++; }
        }
      }
      for (const [id, items] of Object.entries(source.carts)) if (!Object.hasOwn(db.carts, id)) db.carts[id] = items;
      // Old browser sessions are not migrated: customers sign in again.
      return { added, total: { users: db.users.length, orders: db.orders.length } };
    });
    console.log(`Neon: ${result.added.users} usuarios y ${result.added.orders} pedidos importados. Totales: ${result.total.users} usuarios, ${result.total.orders} pedidos.`);
    console.log('El archivo local original se conserva. La migración puede repetirse sin duplicar registros.');
  } finally { await database.close(); }
}
main().catch(() => { console.error('No se completó la migración. Comprueba DATABASE_URL y los datos de origen. El archivo local no fue modificado.'); process.exitCode = 1; });
