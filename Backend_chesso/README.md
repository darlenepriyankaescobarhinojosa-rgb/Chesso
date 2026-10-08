# CHEESO: servidor y checkout

Desde la ra?z del proyecto ejecuta `npm install`, `npm start` y abre **http://localhost:3000**. Tambi?n puedes ejecutar `npm start` desde esta carpeta para el modo local sin variables de `.env.local`.

El checkout utiliza `POST /api/checkout-orders`. Permite comprar como invitado y valida nombre, celular peruano, correo, direcci?n/ubigeo, cantidades y pago contraentrega. La compra directa acepta ?nicamente el molde de 1 kg a S/ 20. El molde grande se coordina por WhatsApp. No calcula costos de env?o ni recoge geolocalizaci?n.

Con `DATABASE_URL`, guarda los datos en PostgreSQL/Neon mediante transacciones. Sin esta variable, solamente en desarrollo local, utiliza `data/db.json`. En Vercel la conexi?n es obligatoria. El pedido se confirma al cliente despu?s de guardar los datos; los reintentos no duplican pedidos.

Se conservan los endpoints de autenticaci?n, carrito y pedidos. Login y registro utilizan el backend y contrase?as derivadas con PBKDF2; el navegador conserva ?nicamente la sesi?n. El carrito visible mantiene su almacenamiento local y el contador del navbar.

Para publicar e importar la base existente consulta [DEPLOYMENT.md](../DEPLOYMENT.md). La configuraci?n de redes y fotograf?as no cambia.

Validaci?n: `npm test` desde la ra?z o esta carpeta. Las pruebas usan datos temporales y no modifican pedidos reales. `CHEESO_DB_PATH` selecciona otra ruta local; `PORT` cambia el puerto de desarrollo.
