import type {
    Request,
    Response
} from 'express'

import AuthService
from '../services/auth-service.js'

const login = async (
    req: Request,
    res: Response
) => {

    try {

        const {
            email,
            password
        } = req.body

        const resultado =
            await AuthService.login(
                email,
                password
            )

        return res.status(200).json(
            resultado
        )

    } catch (error: any) {

        return res.status(
            error.statusCode || 500
        ).json({
            error:
                error.message ||
                'Error interno'
        })

    }

}

export default {
    login
}