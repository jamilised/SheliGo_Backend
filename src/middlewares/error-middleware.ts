import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Si el error tiene un statusCode (como tu AppError), lo usamos. Si no, es un error 500 (del servidor)
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor';

  // Logueamos el error en la consola del backend para poder debuguear
  console.error(`[ERROR] [${req.method}] ${req.url} - ${message}`);
  if (statusCode === 500) {
    console.error(err.stack); // Solo mostramos el stack completo en consola si es un error grave
  }

  // ¡La magia! Le respondemos al cliente un JSON limpio, sin HTML ni rutas raras
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
};