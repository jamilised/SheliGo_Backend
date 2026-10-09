import express from "express";
import cors from "cors";
import helmet from "helmet";

import publicacionesRouter from "./routers/publicaciones-router.js";
import authRouter from "./routers/auth-router.js";
import usuariosRouter from "./routers/usuarios-router.js";
import categoriasRouter from "./routers/categorias-router.js";
import institucionesRouter from "./routers/instituciones-router.js";
import chatRouter from "./routers/chat-router.js";
import notificacionesRouter from "./routers/notificaciones-router.js";
import adminRouter from "./routers/admin-router.js";

import { errorMiddleware } from "./middlewares/error-middleware.js";
import NotFoundError from "./errors/not-found-error.js";

const app = express();

/*
El backend corre detrás de un proxy (Render / Vercel). Sin esto,
express-rate-limit no puede identificar la IP real del cliente y
emite advertencias en consola.
*/
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

// cross-origin: el frontend (otro dominio) puede usar los recursos que sirve la API (de master)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

/*
Orígenes permitidos para el frontend (Vite React).
CORS_ORIGINS admite una lista separada por comas para producción,
por ejemplo: CORS_ORIGINS=https://sheligo.vercel.app,https://otro-dominio.com
*/
const defaultOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:8081",
    "https://sheligo-fub1ieqxe-sheli-go.vercel.app"
];

const allowedOrigins = new Set([
    ...defaultOrigins,
    ...(process.env.CORS_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean)
]);

// Deploys de preview del proyecto en Vercel (sheligo-xxxx-sheli-go.vercel.app)
const vercelPreviewOrigin = /^https:\/\/sheligo(-[a-z0-9-]+)?\.vercel\.app$/i;

app.use(
    cors({
        origin: (origin, callback) => {
            // Peticiones sin Origin (curl, health checks, apps nativas)
            if (!origin || allowedOrigins.has(origin) || vercelPreviewOrigin.test(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    })
);

app.use(express.json());

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "success" });
});

app.use("/categorias", categoriasRouter);
app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/instituciones", institucionesRouter);
app.use("/publicaciones", publicacionesRouter);
app.use("/chat", chatRouter);
app.use("/notificaciones", notificacionesRouter);
// Backoffice: protegido por JWT + rol leído de la base (ver admin-middleware)
app.use("/admin", adminRouter);

// Rutas inexistentes: respuesta JSON consistente en lugar del HTML por defecto
app.use((req, _res, next) => {
    next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

app.use(errorMiddleware);

export default app;
