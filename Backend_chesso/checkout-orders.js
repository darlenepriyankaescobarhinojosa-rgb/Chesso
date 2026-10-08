const crypto = require('crypto');
const ubigeo = require('../Fronted_chesso/data/ubigeo.js');
const catalog = Object.freeze({
  'queso-1kg': { name: 'Molde de 1 kg', weight: '1kg', price: 20, rate: null }
});
const isDirectItem = item => Boolean(item && Object.hasOwn(catalog, item.productId) && Number.isSafeInteger(item.qty) && item.qty > 0 && Number.isSafeInteger(item.qty * catalog[item.productId].price));
class CheckoutError extends Error { constructor(message) { super(message); this.status = 400; } }
function normalize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CheckoutError('Datos del pedido no v\u00e1lidos.');
  const raw = body.customer || {};
  const customer = Object.fromEntries(['name', 'email', 'phone'].map(k => [k, String(raw[k] || '').trim()]));
  customer.email = customer.email.toLowerCase();
  customer.phone = customer.phone.replace(/[\s()-]/g, '').replace(/^\+?51/, '');
  if (customer.name.length < 3 || customer.name.length > 100) throw new CheckoutError('Ingresa tu nombre completo.');
  if (!/^9\d{8}$/.test(customer.phone)) throw new CheckoutError('Ingresa un celular peruano de 9 d\u00edgitos que empiece por 9.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.email.length > 150) throw new CheckoutError('Ingresa un correo electr\u00f3nico v\u00e1lido.');
  const rawAddress = body.delivery || {};
  const department = ubigeo.find(d => d.code === rawAddress.departmentCode);
  const province = department?.provinces.find(p => p.code === rawAddress.provinceCode);
  const district = province?.districts.find(d => d.code === rawAddress.districtCode);
  if (!department || !province || !district) throw new CheckoutError('Selecciona departamento, provincia y distrito del Per\u00fa.');
  const address = String(rawAddress.address || '').trim(), reference = String(rawAddress.reference || '').trim();
  if (address.length < 5 || address.length > 300 || reference.length < 3 || reference.length > 500) throw new CheckoutError('Completa la direcci\u00f3n exacta y la referencia.');
  if (body.payment !== 'contraentrega') throw new CheckoutError('El m\u00e9todo disponible es pago contraentrega.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) throw new CheckoutError('Agrega productos antes de confirmar.');
  const quantities = new Map();
  for (const item of body.items) {
    if (item?.productId === 'queso-grande') throw new CheckoutError('El molde grande se coordina por WhatsApp.');
    if (!isDirectItem(item)) throw new CheckoutError('Producto o cantidad no v\u00e1lidos.');
    const qty = (quantities.get(item.productId) || 0) + item.qty;
    if (!Number.isSafeInteger(qty * 18)) throw new CheckoutError('Cantidad no v\u00e1lida.');
    quantities.set(item.productId, qty);
  }
  const items = [...quantities].map(([productId, qty]) => ({ productId, ...catalog[productId], qty }));
  const knownProductsSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
  if (!Number.isSafeInteger(knownProductsSubtotal)) throw new CheckoutError('Importe no v\u00e1lido.');
  const submissionId = String(body.submissionId || '');
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(submissionId)) throw new CheckoutError('Identificador de pedido no v\u00e1lido.');
  return { submissionId, customer, items, delivery: { country: 'PE', departmentCode: department.code, department: department.name, provinceCode: province.code, province: province.name, districtCode: district.code, district: district.name, address, reference }, payment: 'contraentrega', totals: { knownProductsSubtotal, shipping: null, finalTotal: null, hasVariableWeight: false } };
}
function createOrder(body, db) {
  const order = normalize(body);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(order)).digest('hex');
  const existing = db.orders.find(o => o.submissionId === order.submissionId);
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new CheckoutError('Este identificador ya pertenece a otro pedido.');
    return { order: existing, created: false };
  }
  const saved = { ...order, id: `CHEESO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, fingerprint, status: 'pending-coordination', createdAt: new Date().toISOString() };
  db.orders.push(saved);
  return { order: saved, created: true };
}
module.exports = { normalize, createOrder, CheckoutError, isDirectItem };
