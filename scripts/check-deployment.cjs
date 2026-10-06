const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../vercel.json');
for (const name of ['index.html', 'checkout.js', 'checkout.css', 'social-links.js', 'data/ubigeo.js']) {
  if (!fs.existsSync(path.join(root, config.outputDirectory, name))) throw new Error(`Falta el archivo público ${name}`);
}
if (fs.existsSync(path.join(root, config.outputDirectory, '.env.local')) || fs.existsSync(path.join(root, config.outputDirectory, 'data/db.json'))) {
  throw new Error('Los datos privados no deben estar dentro del directorio público.');
}
console.log('CHEESO: archivos públicos y funciones preparados para Vercel.');
