const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { createOrder, isDirectItem } = require("./checkout-orders");
const FRONTEND_DIR = path.resolve(__dirname, "../Fronted_chesso");
const PORT = Number(process.env.PORT || 3000);
const { getDatabase } = require("./database");

function send(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (req.body !== undefined) {
    try { return Promise.resolve(typeof req.body === "string" || Buffer.isBuffer(req.body) ? JSON.parse(String(req.body)) : req.body); }
    catch { const error = new Error("JSON invalido"); error.status = 400; return Promise.reject(error); }
  }
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload demasiado grande"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        const error = new Error("JSON invalido"); error.status = 400; reject(error);
      }
    });
  });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const result = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function getToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getUserFromRequest(req, db) {
  const token = getToken(req);
  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find(user => user.id === userId) || null;
}

async function handle(req, res) {
  if (req.method === "OPTIONS") return send(res, 200, { ok: true });

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
    let requested;
    try { requested = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: "Ruta no valida" }); }
    const file = path.resolve(FRONTEND_DIR, "." + (requested === "/" ? "/index.html" : requested));
    if (!file.startsWith(FRONTEND_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: "Archivo no encontrado" });
    const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    return fs.createReadStream(file).pipe(res);
  }
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      await getDatabase().transaction(() => undefined);
      return send(res, 200, { ok: true, service: "CHEESO backend", database: process.env.DATABASE_URL ? "postgresql" : "local" });
    }
    if (["POST", "PUT"].includes(req.method)) req.body = await parseBody(req);
    const result = await getDatabase().transaction(db => handleApi(req, url, db));
    return send(res, result.status, result.payload);
  } catch (error) {
    return send(res, error.status || 500, { error: error.status ? error.message : "No se pudo guardar el pedido. Intenta nuevamente." });
  }
}

async function handleApi(req, url, db) {
  // Return the response only after the database transaction commits.
  const res = null;
  const send = (_, status, payload) => ({ status, payload });

    if (req.method === "POST" && url.pathname === "/api/checkout-orders") {
      const body = await parseBody(req);
      const result = createOrder(body, db);
      const { fingerprint, ...publicOrder } = result.order;
      return send(res, result.created ? 201 : 200, { order: publicOrder });
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, { ok: true, service: "CHESO backend" });
    }

    if (req.method === "POST" && url.pathname === "/api/register") {
      const body = await parseBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const password = String(body.password || "");

      if (!name || !email || !phone || password.length < 4) {
        return send(res, 400, { error: "Nombre, correo, telefono y contrasena son obligatorios" });
      }
      if (db.users.some(user => user.email === email)) {
        return send(res, 409, { error: "El correo ya esta registrado" });
      }

      const passwordData = hashPassword(password);
      const user = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        salt: passwordData.salt,
        passwordHash: passwordData.hash,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = user.id;
      db.carts[user.id] = [];
      return send(res, 201, { user: publicUser(user), token });
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await parseBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = db.users.find(item => item.email === email);

      if (!user || !verifyPassword(password, user)) {
        return send(res, 401, { error: "Correo o contrasena incorrectos" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = user.id;
      return send(res, 200, { user: publicUser(user), token, cart: (db.carts[user.id] || []).filter(isDirectItem) });
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const token = getToken(req);
      delete db.sessions[token];
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/cart") {
      const user = getUserFromRequest(req, db);
      if (!user) return send(res, 401, { error: "No autorizado" });
      return send(res, 200, { cart: (db.carts[user.id] || []).filter(isDirectItem) });
    }

    if (req.method === "PUT" && url.pathname === "/api/cart") {
      const user = getUserFromRequest(req, db);
      if (!user) return send(res, 401, { error: "No autorizado" });
      const body = await parseBody(req);
      if (Array.isArray(body.cart) && body.cart.some(item => !isDirectItem(item))) return send(res, 400, { error: "Solo el molde de 1 kg se compra directamente. El molde grande se coordina por WhatsApp." });
      db.carts[user.id] = Array.isArray(body.cart) ? body.cart : [];
      return send(res, 200, { cart: db.carts[user.id] });
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      const user = getUserFromRequest(req, db);
      if (!user) return send(res, 401, { error: "No autorizado" });
      const body = await parseBody(req);
      if (Array.isArray(body.items) && body.items.some(item => !isDirectItem(item))) return send(res, 400, { error: "Solo el molde de 1 kg se compra directamente. El molde grande se coordina por WhatsApp." });
      const order = {
        id: `CHESO-${Date.now()}`,
        userId: user.id,
        user: publicUser(user),
        items: Array.isArray(body.items) ? body.items : [],
        total: Number(body.total || 0),
        address: String(body.address || "").trim(),
        reference: String(body.reference || "").trim(),
        phone: String(body.phone || "").trim(),
        payment: String(body.payment || "").trim(),
        createdAt: new Date().toISOString()
      };

      if (!order.items.length || !order.address || !order.reference || !order.phone || !order.payment) {
        return send(res, 400, { error: "Faltan datos para confirmar el pedido" });
      }

      db.orders.push(order);
      db.carts[user.id] = [];
      return send(res, 201, { order });
    }

    return send(res, 404, { error: "Ruta no encontrada" });
}
const server = http.createServer(handle);
if (require.main === module) server.listen(PORT, () => {
  console.log(`CHEESO disponible en http://localhost:${PORT}`);
});
module.exports = { server, handle };
