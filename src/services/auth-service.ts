import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import AppError from '../errors/app-error.js'
import AuthRepository from '../repositories/auth-repository.js'

class AuthService {

    repository =
        new AuthRepository()

    login = async (
        email: string,
        password: string
    ) => {

        const usuario =
            await this.repository
                .getByEmail(email)

        if (!usuario) {

            throw new AppError(
                'Credenciales inválidas',
                401
            )

        }

        const passwordValida =
            await bcrypt.compare(
                password,
                usuario.password_hash
            )

        if (!passwordValida) {

            throw new AppError(
                'Credenciales inválidas',
                401
            )

        }

        const token =
            jwt.sign(
                {
                    userId: usuario.id
                },
                process.env.JWT_SECRET!,
                {
                    expiresIn: '7d'
                }
            )

        return {
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                foto: usuario.foto
            }
        }

    }

}

export default new AuthService()