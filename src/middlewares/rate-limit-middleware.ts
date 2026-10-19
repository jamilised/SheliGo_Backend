import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const VENTANA_MS = 15 * 60 * 1000;

const mensajeLimite = (texto: string) => ({ status: 'error', message: texto });

// Usuario logueado (lo deja authMiddleware); si no hay, la IP
const claveUsuarioOIp = (req: Request, res: Response): string =>
    typeof res.locals.userIdLogged === 'string'
        ? `usuario:${res.locals.userIdLogged}`
        : ipKeyGenerator(req.ip ?? '');

// Login, registro y Google: solo cuentan los intentos fallidos
export const authLimiter = rateLimit({
    windowMs: VENTANA_MS,
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: mensajeLimite('Demasiados intentos. Intenta nuevamente en 15 minutos.')
});

// Cambio de contraseña: frena adivinar la contraseña actual con un token robado
export const cambioContrasenaLimiter = rateLimit({
    windowMs: VENTANA_MS,
    max: 5,
    skipSuccessfulRequests: true,
    keyGenerator: claveUsuarioOIp,
    standardHeaders: true,
    legacyHeaders: false,
    message: mensajeLimite('Demasiados intentos de cambio de contraseña. Intenta nuevamente en 15 minutos.')
});

// Subidas de imágenes (procesarlas con sharp es caro). Por usuario, no por IP:
// en una escuela muchos alumnos comparten la misma IP pública
export const subidaImagenesLimiter = rateLimit({
    windowMs: VENTANA_MS,
    max: 40,
    skip: (req) => !req.is('multipart/form-data'),
    keyGenerator: claveUsuarioOIp,
    standardHeaders: true,
    legacyHeaders: false,
    message: mensajeLimite('Subiste demasiadas imágenes en poco tiempo. Intenta nuevamente en unos minutos.')
});
