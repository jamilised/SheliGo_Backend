import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js'

class UsuariosService {
    private usuariosRepo = new UsuariosRepository();

    getPerfil = async (id: string | undefined) => {

        if (!id) {
            throw new AppError('ID de usuario no proporcionado', 400);
        }

        const usuario = await this.usuariosRepo.getById(id);
        if (!usuario) {
            throw new AppError('Usuario no encontrado', 404);
        }

        // Si el usuario no tiene foto cargada
        if (!usuario.foto) {
            console.log(`Usuario ${id} sin foto, usando Gravatar por defecto`)
            usuario.foto = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
        }
        return usuario;
    };
}

export default new UsuariosService;