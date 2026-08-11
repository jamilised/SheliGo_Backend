import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import publicacionesRouter
  from "./routers/publicaciones-router.js";

import authRouter
  from './routers/auth-router.js';

import usuariosRouter
  from './routers/usuarios-router.js';

import categoriasRouter 
  from './routers/categorias-router.js';

import institucionesRouter 
  from './routers/instituciones-router.js';

import chatRouter 
  from './routers/chat-router.js';


import { errorMiddleware } 
  from './middlewares/error-middleware.js';

const app = express();

app.use(helmet());
/*
Permite que el frontend
(Vite React)
pueda consumir el backend.
*/

app.use(
    cors({
        origin: [
            "http://localhost:5173", 
            "http://localhost:8081", 
            "https://sheligo-fub1ieqxe-sheli-go.vercel.app" 
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        ],
        credentials: true
    })
);

app.use(express.json());

app.use(
  '/categorias', 
  categoriasRouter
);

app.use(
  '/auth', 
  authRouter
);

app.use(
  '/usuarios', 
  usuariosRouter
);

app.use(
  '/instituciones', 
  institucionesRouter
);

app.use(
  "/publicaciones",
  publicacionesRouter
);

app.use(
  '/chat', 
  chatRouter
);

app.use(
  errorMiddleware
);

export default app; 