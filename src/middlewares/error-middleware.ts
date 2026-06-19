import type { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor';

  console.error(`[ERROR] [${req.method}] ${req.url} - ${message}`);
  
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
};