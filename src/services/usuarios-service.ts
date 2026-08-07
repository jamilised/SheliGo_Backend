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
  // 1. Buscar al usuario
  const usuario = await this.usuariosRepo.findById(usuarioId);
  if (!usuario) {
    throw new AppError('Usuario no encontrado.', 404);
  }

  // Si el usuario se creó por OAuth o no tiene contraseña seteada
  if (!usuario.password_hash) {
    throw new AppError('Este usuario no posee una contraseña configurada.', 400);
  }

  // 2. Comparar la contraseña actual con password_hash
  const esPasswordCorrecta = await bcrypt.compare(contrasenaActual, usuario.password_hash);
  if (!esPasswordCorrecta) {
    throw new AppError('La contraseña actual es incorrecta.', 400);
  }

  // 3. Hashear y guardar
  const saltRounds = 10;
  const nuevoHash = await bcrypt.hash(nuevaContrasena, saltRounds);

  await this.usuariosRepo.updatePassword(usuarioId, nuevoHash);
  return true;
}
}

export default new UsuariosService;