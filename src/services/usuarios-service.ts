import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js'
import { StorageHelper } from '../helpers/storage-helper.js';


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
        
        usuario.foto = StorageHelper.buildUrl(usuario.foto);
        
        return usuario;
    };
}

export default new UsuariosService;