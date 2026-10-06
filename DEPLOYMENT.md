# CHEESO en Vercel y Neon

La web conserva sus archivos en `Fronted_chesso`. Las funciones de `api` reutilizan el backend existente y se publican en el mismo dominio.

## Desarrollo y pruebas

Desde la raíz del repositorio:

```powershell
npm install
npm test
npm run build
npm start
```

Abre `http://localhost:3000`. Sin `DATABASE_URL`, el servidor local conserva `Backend_chesso/data/db.json`. Las pruebas usan datos temporales independientes.

## Base de datos

1. Crea PostgreSQL en Neon o usa la integración Neon del proyecto de Vercel. Se seleccionó el plan gratuito y la autenticación propia de CHEESO.
2. Configura la conexión con pooling como `DATABASE_URL` en **Production** de Vercel. La URL debe incluir SSL. Nunca agregues esta variable al JavaScript público.
3. Para importar los datos locales, coloca la conexión en `.env.local`, siguiendo `.env.example`, o ejecuta `vercel env pull .env.local --environment=production` desde la raíz vinculada.
4. Ejecuta `npm run db:migrate`. Se crean `cheeso_users`, `cheeso_sessions`, `cheeso_carts` y `cheeso_orders`, con registros JSONB compatibles con los datos actuales. Los pedidos y usuarios conservan sus identificadores; las sesiones anteriores requieren iniciar sesión nuevamente. La migración no reemplaza registros en conflicto ni elimina el archivo original y puede repetirse.

En Vercel la API rechaza operaciones si falta `DATABASE_URL`. Las escrituras se confirman antes de mostrar un pedido recibido. Las transacciones protegen solicitudes simultáneas y reintentos.

## Publicación

Importa el repositorio GitHub **Chesso** en Vercel con raíz `.`. La configuración está en `vercel.json`: framework **Other**, build `npm run build`, salida `Fronted_chesso`. Si Vercel no puede acceder al repositorio, habilita **Chesso** en su integración GitHub.

También puedes publicar directamente desde la carpeta vinculada:

```powershell
vercel --prod
```

Comprueba `/api/health`: debe devolver `ok: true` y `database: "postgresql"`. Revisa fotos, contador, checkout y redes. Para probar pedidos utiliza una base independiente de pruebas.

## Archivos privados

`.gitignore` excluye `.env`, `.env.*` (excepto `.env.example`), `.vercel`, `node_modules`, la base local y capturas de la raíz. `.vercelignore` excluye la base local del despliegue. El código, fotos públicas, `package-lock.json`, `.env.example` y `vercel.json` sí se publican.

Comprueba la cuenta vinculada con `vercel whoami`. Las credenciales se administran mediante Vercel/Neon y nunca se incluyen en commits.
