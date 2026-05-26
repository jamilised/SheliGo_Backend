import type { Request, Response, NextFunction } from 'express'
import UsuariosService from '../services/usuarios-service.js'

class HeaderController {
    usuariosService = new UsuariosService()
    getDatosHeader = async (req: Request, res: Response, next: NextFunction) => {
        console.log('EJECUTANDO: getDatosHeader en HomeController')
        try {

            const userId = res.locals.userIdLogged

            const perfil = await this.usuariosService.getPerfil(userId)

            return res.status(200).json({
                status: 'success',
                data: {
                    usuario: perfil
                }
            })
        } catch (error) {
            return next(error)
        }
    }
}

export default HeaderController