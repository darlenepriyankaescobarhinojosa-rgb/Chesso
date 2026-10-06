const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { JsonDatabase, PostgresDatabase } = require('../database');

test('simultaneous local writes keep every order and a failed transaction saves nothing', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cheeso-storage-'));
  const filename = path.join(directory, 'db.json');
  try {
    const database = new JsonDatabase(filename);
    await Promise.all(Array.from({ length: 12 }, (_, index) => database.transaction(async db => {
      await new Promise(resolve => setImmediate(resolve));
      db.orders.push({ id: `test-${index}` });
    })));
    assert.equal(JSON.parse(fs.readFileSync(filename)).orders.length, 12);
    await assert.rejects(database.transaction(db => { db.orders.push({ id: 'not-saved' }); throw new Error('failure'); }));
    assert.equal(JSON.parse(fs.readFileSync(filename)).orders.length, 12);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

function fakePool(failInsert = false) {
  const statements = [], releases = [];
  let sequence = 0;
  return {
    statements, releases, on() {},
    async connect() {
      const id = ++sequence;
      return {
        async query(text, values) {
          statements.push({ id, text, values });
          if (failInsert && text.startsWith('INSERT')) throw new Error('Database unavailable');
          return { rows: [] };
        },
        release() { releases.push(id); }
      };
    }
  };
}

test('PostgreSQL commits writes on one locked client before returning success', async () => {
  const pool = fakePool();
  const database = new PostgresDatabase('', pool);
  const result = await database.transaction(db => {
    db.orders.push({ id: 'test-order', customer: { name: "O'Connor" } });
    return 'saved';
  });
  assert.equal(result, 'saved');
  const calls = pool.statements.filter(item => item.id === 2);
  assert.equal(calls[0].text, 'BEGIN');
  assert.ok(calls.some(item => item.text.includes('pg_advisory_xact_lock')));
  const insert = calls.find(item => item.text.startsWith('INSERT'));
  assert.deepEqual(insert.values, ['test-order', JSON.stringify({ id: 'test-order', customer: { name: "O'Connor" } })]);
  assert.equal(calls.at(-1).text, 'COMMIT');
  assert.deepEqual(pool.releases, [1, 2]);
});

test('PostgreSQL write failure rolls back, releases the client and cannot return success', async () => {
  const pool = fakePool(true);
  const database = new PostgresDatabase('', pool);
  await assert.rejects(database.transaction(db => { db.orders.push({ id: 'not-saved' }); return 'saved'; }));
  assert.equal(pool.statements.at(-1).text, 'ROLLBACK');
  assert.deepEqual(pool.releases, [1, 2]);
});

test('Vercel without DATABASE_URL cannot silently fall back to a local file', () => {
  const env = { ...process.env, VERCEL: '1' };
  delete env.DATABASE_URL;
  const child = spawnSync(process.execPath, ['-e', `try { require('./Backend_chesso/database').getDatabase(); process.exit(1); } catch (error) { if (error.status !== 503) process.exit(2); }`], { cwd: path.resolve(__dirname, '../..'), env });
  assert.equal(child.status, 0);
});
