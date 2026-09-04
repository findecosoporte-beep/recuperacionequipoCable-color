# API Órdenes

API REST en Next.js 16 para gestionar órdenes de entrega. El modelo replica las columnas de tu hoja: **Orden**, **Cliente**, **Ciudad**, **Colonia**, **Direccion**, **Telefono** y **Comentario**. Está pensada para producción en Railway con PostgreSQL.

## Requisitos

- Node.js 20 o superior
- PostgreSQL 16 (local con Docker o el plugin de Railway)

## Arranque local

```bash
docker compose up -d
copy .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

La documentación de la API queda en [http://localhost:3000/docs](http://localhost:3000/docs). El panel React está en [http://localhost:3000](http://localhost:3000) y el login en [http://localhost:3000/login](http://localhost:3000/login).

## Autenticación

El frontend React inicia sesión con email y contraseña. El servidor responde un JWT.

```http
POST /api/v1/auth/login
{ "email": "admin@ordenes.local", "password": "Admin123!" }

Authorization: Bearer <token>
```

Las rutas de `/api/v1` también aceptan `X-API-Key` para scripts. En desarrollo, si no hay `API_KEY` ni JWT, la API no exige clave.

Usuario inicial (tras `npm run db:seed`): `admin@ordenes.local` / `Admin123!`

Los **técnicos recuperadores** se dan de alta en el panel (`/tecnicos`). Usan el mismo login de la API para la app de campo; no entran al panel web. En **Asignación** (`/asignacion`) se les pasan las órdenes por ciudad.

Roles del panel:

- **Administrador:** crear/editar/borrar técnicos, borrar órdenes, y el resto del panel.
- **Operador:** órdenes, estado, acuses y asignación. No puede gestionar técnicos ni borrar órdenes.

Si desactivas un usuario, su JWT deja de valer en la siguiente petición.

## Protección contra abuso

La API no evita un ataque masivo de internet (para eso haría falta Cloudflare delante), pero sí frena el abuso típico:

- **Ráfaga:** 30 peticiones cada 10 segundos por IP, en memoria. Corta un bombardeo antes de llegar a Postgres.
- **Tope compartido:** 90 peticiones por minuto por IP, guardado en Postgres. Sirve si hay varias réplicas en Railway.
- **Login:** 8 intentos por minuto por IP (protege bcrypt) y 10 cada 15 minutos en total. Además 8 intentos cada 15 minutos **por cuenta**.
- **Salud:** `/api/health` cachea el ping a la base 5 segundos y tiene su propio tope, para que un escaneo no tumbe Postgres.
- **Tamaño:** JSON normal hasta 512 KB, importación masiva hasta 2 MB, Excel hasta 4 MB.
- Si se pasa el tope, responde `429` con cabecera `Retry-After`.


## Endpoints

| Método   | Ruta                   | Descripción                        |
| ----------| ------------------------| ------------------------------------|
| `GET`    | `/api/health`          | Salud de la app y de Postgres      |
| `POST`   | `/api/v1/auth/login`   | Login (JWT)                        |
| `GET`    | `/api/v1/auth/me`      | Usuario de la sesión               |
| `GET`    | `/api/v1/ordenes`      | Listado paginado y filtros         |
| `POST`   | `/api/v1/ordenes`      | Crear una orden                    |
| `GET`    | `/api/v1/ordenes/:id`  | Consultar por id o número de orden |
| `PATCH`  | `/api/v1/ordenes/:id`  | Actualizar campos                  |
| `DELETE` | `/api/v1/ordenes/:id`  | Eliminar                           |
| `POST`   | `/api/v1/ordenes/bulk` | Importar hasta 500 órdenes         |
| `GET`    | `/api/v1/tecnicos`     | Listado de técnicos recuperadores  |
| `POST`   | `/api/v1/tecnicos`     | Crear técnico                      |
| `GET`    | `/api/v1/tecnicos/:id` | Consultar técnico                  |
| `PATCH`  | `/api/v1/tecnicos/:id` | Actualizar o activar/desactivar    |
| `DELETE` | `/api/v1/tecnicos/:id` | Eliminar técnico                   |
| `GET`    | `/api/v1/asignaciones` | Órdenes agrupadas por ciudad       |
| `POST`   | `/api/v1/asignaciones` | Asignar ciudad a un técnico        |
| `POST`   | `/api/v1/asignaciones/liberar` | Liberar ciudad de un técnico |

### Filtros de listado

`q`, `ciudad`, `colonia`, `cliente`, `orden`, `page`, `limit` (máx. 100), `sort` (`createdAt` \| `orden` \| `cliente` \| `ciudad`), `order` (`asc` \| `desc`).

### Ejemplo

```bash
curl -X POST "http://localhost:3000/api/v1/ordenes" ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: cambia-esta-clave-en-produccion" ^
  -d "{\"orden\":\"1001\",\"cliente\":\"Juan Pérez\",\"ciudad\":\"Guadalajara\",\"colonia\":\"Centro\",\"direccion\":\"Av. Juárez 100\",\"telefono\":\"3312345678\",\"comentario\":\"Entregar por la tarde\"}"
```

## Despliegue en Railway

1. Crea un proyecto en [Railway](https://railway.app) y conecta este repositorio.
2. Añade una base **PostgreSQL**.
3. En el servicio de la API, Variables:
   - `DATABASE_URL` = referencia a `${{Postgres.DATABASE_URL}}`
   - `API_KEY` = una clave larga y aleatoria
   - `ALLOWED_ORIGINS` = el dominio de tu frontend, o `*` mientras pruebas
4. Settings → Networking → **Generate Domain**.
5. Railway detecta el `Dockerfile` y ejecuta las migraciones al arrancar.

Si el build falla porque no alcanza Postgres, es normal: las migraciones corren en el arranque, no durante la imagen.

## Variables de entorno

| Variable               | Obligatorio      | Descripción                                       |
| ------------------------| ------------------| ---------------------------------------------------|
| `DATABASE_URL`         | Sí               | Cadena de PostgreSQL                              |
| `JWT_SECRET`           | Sí en producción | Firma de los tokens de login                      |
| `JWT_EXPIRES_IN`       | No               | Caducidad del JWT. Por defecto `7d`               |
| `ADMIN_EMAIL`          | No               | Email del usuario inicial del seed                |
| `ADMIN_PASSWORD`       | No               | Contraseña del usuario inicial del seed           |
| `ALLOWED_ORIGINS`      | No               | Orígenes CORS separados por coma. Por defecto `*` |
| `RATE_LIMIT_MAX`       | No               | Tope compartido por IP y minuto. Por defecto `90` |
| `RATE_LIMIT_WINDOW_MS` | No               | Ventana del tope compartido. Por defecto `60000`  |
