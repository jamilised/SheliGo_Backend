import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import publicacionesRouter from "./routers/publicaciones-router.js";
import authRouter from "./routers/auth-router.js";
import usuariosRouter from "./routers/usuarios-router.js";
import categoriasRouter from "./routers/categorias-router.js";
import institucionesRouter from "./routers/instituciones-router.js";
import chatRouter from "./routers/chat-router.js";

import { errorMiddleware } from "./middlewares/error-middleware.js";

const app = express();

// Permite compartir recursos entre dominios con Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8081",
  "https://sheligo.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (como Postman o Server-to-Server) y las de la lista permitida
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/categorias", categoriasRouter);
app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/instituciones", institucionesRouter);
app.use("/publicaciones", publicacionesRouter);
app.use("/chat", chatRouter);

app.use(errorMiddleware);

export default app;