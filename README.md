# Portal PQRS

Aplicación para registrar y gestionar peticiones, quejas, reclamos y sugerencias. El repositorio está organizado en dos carpetas:

- `backend/`: API REST en Node.js/Express y esquema MySQL.
- `frontend/`: aplicación Angular 21 con formularios reactivos.

La autorización se valida en la API: registrarse siempre crea un usuario `SOLICITANTE`; únicamente las cuentas `FUNCIONARIO` pueden consultar toda la bandeja, generar borradores, responder o cambiar estados.

## Requisitos

- Node.js 20 o superior y npm.
- MySQL 8 o superior.

## Preparar la base de datos

Desde `backend`, crea el esquema (ajusta usuario/servidor si aplica):

```powershell
mysql -u root -p < src/database/schema.sql
```

Copia `.env.example` a `.env` y configura la conexión a MySQL y un `JWT_SECRET` aleatorio de al menos 32 caracteres. No uses el valor de ejemplo en un entorno real. En PowerShell:

```powershell
Copy-Item .env.example .env
```

Carga dos usuarios de prueba por rol:

```powershell
npm.cmd install
npm.cmd run seed
```

| Rol | Correo | Contraseña |
|---|---|---|
| Solicitante | `ana@example.com` | `Solicitante123!` |
| Solicitante | `luis@example.com` | `Solicitante123!` |
| Funcionario | `funcionario@example.com` | `Funcionario123!` |
| Funcionario | `funcionario2@example.com` | `Funcionario123!` |

Las contraseñas se guardan usando bcrypt. Los usuarios de prueba se crean/actualizan al ejecutar el seed; no ejecutes esta carga en producción.

## Ejecutar

Terminal 1, desde `backend`:

```powershell
npm.cmd run dev
```

Terminal 2, desde `frontend`:

```powershell
npm.cmd install
npm.cmd start
```

Abre `http://localhost:4200`. La API escucha en `http://localhost:3000`; comprueba su disponibilidad en `/api/health`.

## Funcionalidad incluida

- Registro público con validaciones de nombre, documento, correo, teléfono y contraseña.
- Inicio de sesión con JWT, contraseñas con hash bcrypt y guardado de rol en el usuario.
- Radicación de PQRS con consecutivo anual `PQRS-AAAA-000001`, asignado dentro de una transacción.
- Consulta de solicitudes propias y edición/eliminación únicamente mientras estén `Radicada`.
- Bandeja de funcionario con filtros por estado, tipo y fecha; paginación en la API.
- Flujo de funcionario `Radicada` → `En trámite` → `Respondida` → `Cerrada`.
- Borrador de respuesta generado con plantillas locales, editable por el funcionario antes de enviar. No requiere clave de un proveedor externo ni se presenta como respuesta automática definitiva.
- Autorización de tratamiento de datos requerida para radicar.

## API principal

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/pqrs?page=1&limit=10&status=Radicada&type=Queja&from=AAAA-MM-DD&to=AAAA-MM-DD`
- `POST /api/pqrs`, `GET /api/pqrs/:id`, `PUT /api/pqrs/:id`, `DELETE /api/pqrs/:id`
- `POST /api/pqrs/:id/draft`, `POST /api/pqrs/:id/response`, `PATCH /api/pqrs/:id/status`

Las rutas de PQRS requieren `Authorization: Bearer <token>`. El servidor es quien aplica las restricciones de rol y propiedad; ocultar acciones en Angular no sustituye esta autorización.

## Pruebas

Desde `backend`: `npm.cmd test`.

Desde `frontend`: `npm.cmd test -- --watch=false`.
