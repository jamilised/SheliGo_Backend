import UsuariosRepository from '../repositories/usuarios-repository.js';

class UsuariosService {
    private usuariosRepo = new UsuariosRepository();

    getPerfil = async (id: string | undefined) => {
        // Si el controlador no nos pasa un ID (porque el usuario no está logueado)
        if (!id) {
            return null;
        }

        const usuario = await this.usuariosRepo.getById(id);
        if (!usuario) {
            return null;
        }

        return usuario;
    };
}

export default UsuariosService;