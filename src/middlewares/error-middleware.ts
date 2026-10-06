import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import AppError from '../errors/app-error.js';
import NotFoundError from '../errors/not-found-error.js';

/*
Errores de PostgreSQL que en realidad son datos inválidos del cliente.
https://www.postgresql.org/docs/current/errcodes-appendix.html
*/
const POSTGRES_CLIENT_ERRORS: Record<string, { status: number; message: string }> = {
  '22P02': { status: 400, message: 'Uno de los identificadores enviados no es válido.' },
  '22007': { status: 400, message: 'La fecha enviada no es válida.' },
  '22008': { status: 400, message: 'La fecha enviada está fuera de rango.' },
  '23503': { status: 400, message: 'Uno de los datos relacionados (categoría, institución o usuario) no existe.' },
  '23505': { status: 409, message: 'El registro ya existe.' },
  '23502': { status: 400, message: 'Falta un dato obligatorio.' },
  '23514': { status: 400, message: 'Uno de los valores enviados no está permitido.' }
};

const getPostgresClientError = (err: unknown) => {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return null;
  }
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? POSTGRES_CLIENT_ERRORS[code] ?? null : null;
};

export const errorMiddleware = (
  err: unknown,
  req: Request, 
  res: Response, 
  _next: NextFunction
) => {
  const isMulterError = err instanceof multer.MulterError;
  const isControlledError = err instanceof AppError || err instanceof NotFoundError;
  const postgresError = getPostgresClientError(err);
  const rawStatusCode = isMulterError
    ? 400
    : isControlledError
      ? err.statusCode
      : postgresError
        ? postgresError.status
        : 500;
  const responseStatusCode = Number.isInteger(rawStatusCode)
    && rawStatusCode >= 400
    && rawStatusCode < 500
      ? rawStatusCode
      : 500;

  let message = responseStatusCode === 500
    ? 'Ha ocurrido un error interno en el servidor.'
    : postgresError
      ? postgresError.message
      : err instanceof Error
        ? err.message
        : 'La solicitud no es válida.';

  if (isMulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'El archivo supera el tamaño máximo permitido de 8 MB.';
    } else if (
      err.code === 'LIMIT_FILE_COUNT' ||
      err.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      message = 'La cantidad o el campo de archivos no está permitido.';
    } else {
      message = 'La solicitud de carga de archivos no es válida.';
    }
  }

  if (responseStatusCode === 500) {
    console.error(
      `[ERROR] [${req.method}] ${req.originalUrl} - Error interno:`,
      err
    );
  } else if (postgresError) {
    console.error(`[ERROR] [${req.method}] ${req.originalUrl} - ${message}`, err);
  } else {
    console.error(`[ERROR] [${req.method}] ${req.originalUrl} - ${message}`);
  }

  res.status(responseStatusCode).json({
    status: 'error',
    statusCode: responseStatusCode,
    message
  });
};