# SheliGo_Backend

Backend de **SheliGo**, una plataforma para la gestión de objetos perdidos y encontrados dentro de instituciones como escuelas, universidades, clubes y empresas.

El sistema permite administrar publicaciones de objetos perdidos y encontrados, autenticación de usuarios, preguntas y respuestas, chats, carga de imágenes y futuras funcionalidades de matching mediante inteligencia artificial.

---

# Tecnologías

- Node.js
- Express
- TypeScript
- PostgreSQL
- Supabase
- JWT (JSON Web Token)
- Bcrypt
- Multer
- Sharp
- Zod
- Helmet
- CORS
- Express Rate Limit

---

# Arquitectura

El proyecto sigue una arquitectura por capas para mantener el código organizado y escalable.

```
src
│
├── controllers
├── services
├── repositories
├── entities
├── routers
├── middlewares
├── validations
├── database
├── helpers
├── errors
└── storage
```

### Controllers

Reciben las peticiones HTTP y devuelven la respuesta correspondiente.

### Services

Contienen toda la lógica de negocio.

### Repositories

Se encargan exclusivamente del acceso a PostgreSQL.

### Entities

Representan las entidades del sistema.

### Middlewares

Validaciones, autenticación y manejo de errores.

### Helpers

Funciones reutilizables del proyecto.

---

# Funcionalidades implementadas

## Autenticación

- Registro de usuarios
- Inicio de sesión
- Login mediante Google
- JWT
- Contraseñas cifradas con Bcrypt

## Usuarios

- Obtener información del usuario
- Actualizar foto de perfil

## Publicaciones

- Crear publicación
- Eliminar publicación
- Obtener detalle
- Obtener publicaciones recientes
- Buscar publicaciones mediante filtros

## Preguntas

- Crear preguntas
- Responder preguntas
- Obtener preguntas de una publicación

## Instituciones

- Obtener instituciones

## Categorías

- Obtener categorías

## Chat

- Comunicación entre usuarios

---

# Seguridad

El proyecto implementa diversas medidas de seguridad:

- Contraseñas cifradas con Bcrypt.
- Tokens JWT para autenticación.
- Validaciones utilizando Zod.
- Helmet para agregar cabeceras HTTP seguras.
- Configuración de CORS.
- Limitación de peticiones mediante Express Rate Limit.
- Validaciones tanto en frontend como en backend.

---

# Instalación

## Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
```

## Instalar dependencias

```bash
npm install
```

## Crear el archivo `.env`

Ejemplo:

```env
DB_HOST=
DB_PORT=
DB_DATABASE=
DB_USER=
DB_PASSWORD=

JWT_SECRET=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=
```

## Ejecutar

```bash
npm run dev
```

El servidor iniciará por defecto en:

```
http://localhost:3000
```

---

# Endpoints principales

## Auth

```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/google
```

## Usuarios

```
GET /usuarios/me
GET /usuarios/:id
```

## Publicaciones

```
GET    /publicaciones/recientes
GET    /publicaciones/search
GET    /publicaciones/:id
GET    /publicaciones/:id/archivos
GET    /publicaciones/:id/preguntas

POST   /publicaciones
POST   /publicaciones/:id/preguntas
POST   /publicaciones/preguntas/:preguntaId/respuesta

DELETE /publicaciones/:id
```

## Categorías

```
GET /categorias
```

## Instituciones

```
GET /instituciones
```

---

# Estado del proyecto

Actualmente el proyecto continúa en desarrollo.

Próximas funcionalidades previstas:

- Sistema de Matches mediante IA.
- Historial de actividad.
- Sistema de reclamos.
- Recuperación de objetos.
- Mejoras en perfiles de usuario.
- Notificaciones.
- Panel administrativo.

---

# Convenciones

- Arquitectura por capas.
- Código escrito en TypeScript.
- UUID como identificador principal.
- Validaciones con Zod.
- Base de datos PostgreSQL.
- Imágenes almacenadas en Supabase Storage.

## Arquitectura

```mermaid
flowchart LR

Frontend --> Express

Express --> Controllers
Controllers --> Services
Services --> Repositories
Repositories --> PostgreSQL

Services --> SupabaseStorage
Services --> JWT

# Autores

Proyecto desarrollado como trabajo académico para ORT Argentina.

Equipo de desarrollo: **SheliGo**.

