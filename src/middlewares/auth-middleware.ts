import type {
  Request,
  Response,
  NextFunction
} from 'express'

import jwt from 'jsonwebtoken'
import AppError from '../errors/app-error.js'

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {

    const authHeader =
      req.headers.authorization

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new AppError(
        'Acceso denegado. No se proporcionó un token válido.',
        401
      )
    }

    const token =
      authHeader.split(' ')[1]

    if (!token) {
      throw new AppError(
        'Token inválido',
        401
      )
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as jwt.JwtPayload

    res.locals.userIdLogged =
      payload.userId

    res.locals.userIdLogged =
      payload.userId

    next()

  } catch {

    next(
      new AppError(
        'Token inválido o expirado',
        401
      )
    )

  }

}