import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import AppError from '../errors/app-error.js';
import NotFoundError from '../errors/not-found-error.js';

export const errorMiddleware = (
  err: unknown,
  req: Request, 
  res: Response, 
  _next: NextFunction
) => {
  const isMulterError = err instanceof multer.MulterError;
  const isControlledError = err instanceof AppError || err instanceof NotFoundError;
  const rawStatusCode = isMulterError
    ? 400
    : isControlledError
      ? err.statusCode
      : 500;
  const responseStatusCode = Number.isInteger(rawStatusCode)
    && rawStatusCode >= 400
    && rawStatusCode < 500
      ? rawStatusCode
      : 500;

  let message = responseStatusCode === 500
    ? 'Ha ocurrido un error interno en el servidor.'
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
  } else {
    console.error(`[ERROR] [${req.method}] ${req.originalUrl} - ${message}`);
  }

  res.status(responseStatusCode).json({
    status: 'error',
    statusCode: responseStatusCode,
    message
  });
};