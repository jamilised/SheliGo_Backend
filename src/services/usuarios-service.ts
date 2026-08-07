import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js'
import { StorageHelper } from '../helpers/storage-helper.js';
import bcrypt from 'bcrypt';


class UsuariosService {
    private usuariosRepo = UsuariosRepository;

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
  async cambiarContrasena(
    usuarioId: string, 
    contrasenaActual: string, 
    nuevaContrasena: string
  ) {
    // 1. Buscar al usuario en la base de datos
    const usuario = await this.usuariosRepo.findById(usuarioId);
    if (!usuario) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    // 2. Comparar la contraseña actual recibida con el hash almacenado
    const esPasswordCorrecta = await bcrypt.compare(contrasenaActual, usuario.password);
    if (!esPasswordCorrecta) {
      throw new AppError('La contraseña actual es incorrecta.', 400);
    }

    // 3. Verificar que la nueva contraseña no sea idéntica a la actual
    const esMismaContrasena = await bcrypt.compare(nuevaContrasena, usuario.password);
    if (esMismaContrasena) {
      throw new AppError('La nueva contraseña no puede ser igual a la contraseña actual.', 400);
    }

    // 4. Hashear la nueva contraseña
    const saltRounds = 10;
    const nuevoHash = await bcrypt.hash(nuevaContrasena, saltRounds);

    // 5. Guardar en la base de datos
    await this.usuariosRepo.updatePassword(usuarioId, nuevoHash);

    return true;
  }
}

export default new UsuariosService;