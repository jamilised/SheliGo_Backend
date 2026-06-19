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
export const validateQuery = (schema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.query = await schema.parseAsync(req.query) as any;
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                const primerError = error.issues[0]?.message || 'Query params inválidos';
                return next(new AppError(primerError, 400));
            }
            return next(error);
        }
    };
};