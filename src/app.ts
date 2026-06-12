import express from "express";
import cors from "cors";

import publicacionesRouter
from "./routers/publicaciones-router.js";

import headerRouter
from "./routers/header-router.js";

import homeRouter
from "./routers/home-router.js";

import authRouter 
from "./routers/auth-router.js";

import { errorMiddleware } from './middlewares/error-middleware.js';

const app = express();

/*
Permite que el frontend
(Vite React)
pueda consumir el backend.
*/

app.use(

  cors({

    origin:
      "http://localhost:5173",

  })

);

app.use(express.json());

app.use(
  "/publicaciones",
  publicacionesRouter
);

app.use(
  "/header",
  headerRouter
);

app.use(
  "/home",
  homeRouter
);

app.use(
  "/auth", 
  authRouter);

app.use(
  errorMiddleware
);

export default app;