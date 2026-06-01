import type { Request, Response, NextFunction } from 'express'
import AppError from '../errors/app-error.js'

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    console.log("HEADERS:", req.headers);

    const authHeader =
      req.headers.authorization;

    console.log("AUTH HEADER:", authHeader);

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      throw new AppError(
        "Acceso denegado. No se proporcionó un token válido.",
        401
      );
    }

    const token =
      authHeader.split(" ")[1];

    console.log("TOKEN:", token);

    res.locals.userIdLogged =
      token;

    return next();

  } catch (error) {
    return next(error);
  }
};