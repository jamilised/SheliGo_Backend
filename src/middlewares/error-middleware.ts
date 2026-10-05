import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const errorMiddleware = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  let responseStatusCode = statusCode;
  let message = err.message || 'Ocurrió un error interno en el servidor';

  if (err instanceof multer.MulterError) {
    responseStatusCode = 400;

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

  console.error(`[ERROR] [${req.method}] ${req.url} - ${message}`);
  
  if (responseStatusCode === 500) {
    console.error(err.stack);
  }

  res.status(responseStatusCode).json({
    status: 'error',
    statusCode: responseStatusCode,
    message
  });
};