import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import AppError from '../errors/app-error.js';

/**
 * Middleware genérico para validar el body de una petición usando Zod
 */
export const validateBody = (schema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.body = await schema.parseAsync(req.body);
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                const primerError = error.issues[0]?.message || 'Datos inválidos';
                return next(new AppError(primerError, 400));
            }
            return next(error);
        }
    };
};

/**
 * Middleware genérico para validar los Query Params de una petición
 */
// Cambiá el tipo del parámetro schema a z.ZodTypeAny 🚀
export const validateQuery = (schema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Validamos los query params originales
            const validacion = await schema.safeParseAsync(req.query);
            
            if (!validacion.success) {
                throw new AppError(
                    `Validación de URL incorrecta: ${validacion.error.issues.map(e => e.message).join(', ')}`, 
                    400
                );
            }
            
            // 2. Limpiamos y reasignamos de forma segura
            Object.keys(req.query).forEach(key => delete req.query[key]);
            Object.assign(req.query, validacion.data);
            
            return next();
        } catch (error) {
            return next(error);
        }
    };
};