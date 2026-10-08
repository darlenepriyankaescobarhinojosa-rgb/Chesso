const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cheeso-checkout-'));
process.env.CHEESO_DB_PATH = path.join(directory, 'db.json');
const { server } = require('../server');
const { normalize } = require('../checkout-orders');
const ubigeo = require('../../Fronted_chesso/data/ubigeo');
let base;
before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true }); });
function payload() {
  return {
    submissionId: crypto.randomUUID(), customer: { name: 'Cliente de prueba', phone: '929828271', email: 'prueba@example.com' },
    items: [{ productId: 'queso-1kg', qty: 2 }],
    delivery: { departmentCode: '15', provinceCode: '1501', districtCode: '150101', address: 'Direccion de prueba 123', reference: 'Referencia de prueba' },
    payment: 'contraentrega'
  };
}
async function request(url, body, method = 'POST', token) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
test('direct checkout uses the real 1 kg price and ignores client prices', () => {
  const input = payload(); input.items[0].price = 1; input.total = 999;
  const order = normalize(input);
  assert.equal(order.totals.knownProductsSubtotal, 40);
  assert.equal(order.items[0].price, 20); assert.equal(order.items.length, 1);
  assert.equal(order.totals.finalTotal, null); assert.equal(order.totals.shipping, null); assert.equal(order.totals.hasVariableWeight, false);
  assert.equal(order.delivery.country, 'PE'); assert.equal(order.delivery.district, 'Lima'); assert.equal(order.location, undefined);
});
test('large mold cannot enter direct checkout', () => {
  const input = payload(); input.items = [{ productId: 'queso-grande', qty: 3 }];
  assert.throws(() => normalize(input), error => error.status === 400 && /WhatsApp/.test(error.message));
});
test('required fields, invalid products/quantities, large molds and wrong hierarchy are rejected', () => {
  const cases = [
    value => { value.customer.name = ''; }, value => { value.customer.phone = '829828271'; },
    value => { value.customer.email = 'prueba@correo'; }, value => { value.delivery.address = ''; },
    value => { value.delivery.reference = ''; }, value => { value.delivery.departmentCode = '01'; },
    value => { value.items[0].qty = 0; }, value => { value.items[0].qty = 1.5; },
    value => { value.items[0].qty = Number.MAX_SAFE_INTEGER; }, value => { value.items[0].productId = 'mozzarella'; },
    value => { value.items[0].productId = 'constructor'; }, value => { value.items = [null]; },
    value => { value.payment = 'visa'; }, value => { value.items = []; },
    value => { value.items.push({ productId: 'queso-grande', qty: 1 }); }
  ];
  cases.forEach(change => { const input = payload(); change(input); assert.throws(() => normalize(input), error => error.status === 400); });
  assert.throws(() => normalize(null), error => error.status === 400);
});
test('Peruvian phones are normalized and location is not collected or stored', () => {
  const input = payload(); input.customer.phone = '+51 929 828 271'; input.location = { latitude: -12.0464, longitude: -77.0428 };
  const order = normalize(input); assert.equal(order.customer.phone, '929828271'); assert.equal(order.location, undefined);
});
test('all dependent region entries belong to a consistent hierarchy', () => {
  assert.equal(ubigeo.length, 25); const codes = new Set();
  for (const department of ubigeo) for (const province of department.provinces) {
    assert.ok(province.code.startsWith(department.code));
    for (const district of province.districts) { assert.ok(district.code.startsWith(province.code)); assert.ok(!codes.has(district.code)); codes.add(district.code); }
  }
  assert.ok(codes.size > 1800);
});
test('API persists complete guest orders and retries cannot duplicate them', async () => {
  const input = payload(); input.location = { latitude: -12.0464, longitude: -77.0428 };
  const result = await request('/api/checkout-orders', input);
  assert.equal(result.status, 201); assert.match(result.body.order.id, /^CHEESO-\d{8}-[A-F0-9]{8}$/);
  assert.equal(result.body.order.fingerprint, undefined);
  const saved = JSON.parse(fs.readFileSync(process.env.CHEESO_DB_PATH)).orders;
  assert.equal(saved.length, 1); assert.equal(saved[0].location, undefined);
  assert.equal(saved[0].customer.email, input.customer.email); assert.equal(saved[0].delivery.reference, input.delivery.reference);
  assert.equal(saved[0].payment, 'contraentrega'); assert.equal(saved[0].items.length, 1);
  const repeat = await request('/api/checkout-orders', input); assert.equal(repeat.status, 200); assert.equal(repeat.body.order.id, result.body.order.id);
  input.customer.name = 'Otro cliente'; assert.equal((await request('/api/checkout-orders', input)).status, 400);
  assert.equal(JSON.parse(fs.readFileSync(process.env.CHEESO_DB_PATH)).orders.length, 1);
});
test('invalid requests do not write orders; an independent order has a new code', async () => {
  const bad = payload(); bad.items[0].qty = -1;
  assert.equal((await request('/api/checkout-orders', bad)).status, 400);
  const input = payload(); input.items = [{ productId: 'queso-1kg', qty: 1 }];
  const result = await request('/api/checkout-orders', input); assert.equal(result.status, 201);
  assert.equal(result.body.order.totals.knownProductsSubtotal, 20); assert.equal(result.body.order.totals.hasVariableWeight, false);
  const orders = JSON.parse(fs.readFileSync(process.env.CHEESO_DB_PATH)).orders; assert.equal(orders.length, 2); assert.notEqual(orders[0].id, orders[1].id);
});
test('existing authentication and cart APIs still work', async () => {
  assert.equal((await request('/api/cart', undefined, 'GET')).status, 401);
  const user = { name: 'Cuenta de prueba', email: 'cuenta@example.com', phone: '929828271', password: 'prueba123' };
  const registered = await request('/api/register', user); assert.equal(registered.status, 201);
  const login = await request('/api/login', { email: user.email, password: user.password }); assert.equal(login.status, 200);
  const cart = [{ productId: 'queso-1kg', qty: 2 }];
  assert.equal((await request('/api/cart', { cart }, 'PUT', login.body.token)).status, 200);
  assert.deepEqual((await request('/api/cart', undefined, 'GET', login.body.token)).body.cart, cart);
  assert.equal((await request('/api/cart', { cart: [{ productId: 'queso-grande', qty: 1 }] }, 'PUT', login.body.token)).status, 400);
  assert.equal((await request('/api/orders', { items: [{ productId: 'queso-grande', qty: 1 }] }, 'POST', login.body.token)).status, 400);
  assert.equal((await request('/api/logout', {}, 'POST', login.body.token)).status, 200);
  assert.equal((await request('/api/cart', undefined, 'GET', login.body.token)).status, 401);
});
test('same server serves the page, real product assets and delivery selects without a map', async () => {
  for (const file of ['/', '/checkout.js', '/checkout.css', '/data/ubigeo.js', '/img/queso-1kilo-.jpg']) assert.equal((await fetch(base + file)).status, 200);
  const html = await (await fetch(base)).text(); assert.match(html, /data-checkout-step="3"/); assert.doesNotMatch(html, /checkoutMap|geolocation|Ubicaci&oacute;n en el mapa/);
  assert.equal((await fetch(base + '/Backend_chesso/data/db.json')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%5cBackend_chesso%5cdata%5cdb.json')).status, 404);
});

test('simultaneous checkout retries save a single order and independent requests are not lost', async () => {
  const before = JSON.parse(fs.readFileSync(process.env.CHEESO_DB_PATH)).orders.length;
  const input = payload();
  const repeated = await Promise.all([request('/api/checkout-orders', input), request('/api/checkout-orders', input)]);
  assert.deepEqual(repeated.map(item => item.status).sort(), [200, 201]);
  assert.equal(repeated[0].body.order.id, repeated[1].body.order.id);
  const independent = await Promise.all([request('/api/checkout-orders', payload()), request('/api/checkout-orders', payload())]);
  assert.ok(independent.every(item => item.status === 201));
  assert.notEqual(independent[0].body.order.id, independent[1].body.order.id);
  assert.equal(JSON.parse(fs.readFileSync(process.env.CHEESO_DB_PATH)).orders.length, before + 3);
});
