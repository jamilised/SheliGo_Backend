import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { BCRYPT_SALT_ROUNDS } from '../configs/security-config.js';

class UsuariosService {
    private usuariosRepo = UsuariosRepository;

    // Solo fotos subidas a la carpeta usuarios/ (nunca la de por defecto ni avatares de Google).
    // Si falla queda un archivo huérfano, pero el perfil ya es consistente.
    private borrarFotoAnterior = async (foto: string | null | undefined) => {
        if (!foto || foto === StorageHelper.DEFAULT_USER_PHOTO || !foto.startsWith('usuarios/')) return;
        try {
            await StorageHelper.eliminarObjeto(foto);
        } catch (error) {
            console.error(`No se pudo borrar la foto de perfil ${foto}.`, error);
        }
    };

    getPerfil = async (id: string | undefined) => {

        if (!id) {
            throw new AppError('ID de usuario no proporcionado', 400);
        }

        const usuario = await this.usuariosRepo.getById(id);
        if (!usuario) {
            throw new AppError('Usuario no encontrado', 404);
        }

        usuario.foto = StorageHelper.buildUrl(usuario.foto);

        // OBTENER INSTITUCIONES ASOCIADAS
        const instituciones = (await this.usuariosRepo.getInstitucionesByUsuarioId(id)) || [];

        return {
            ...usuario,
            instituciones
        };
    };

    async cambiarContrasena(
        usuarioId: string,
        contrasenaActual: string,
        nuevaContrasena: string
    ) {
        const usuario = await this.usuariosRepo.findById(usuarioId);
        if (!usuario) {
            throw new AppError('Usuario no encontrado.', 404);
        }

        if (!usuario.password_hash) {
            throw new AppError('Este usuario no posee una contraseña configurada.', 400);
        }

        const esPasswordCorrecta = await bcrypt.compare(contrasenaActual, usuario.password_hash);
        if (!esPasswordCorrecta) {
            throw new AppError('La contraseña actual es incorrecta.', 400);
        }

        const nuevoHash = await bcrypt.hash(nuevaContrasena, BCRYPT_SALT_ROUNDS);

        await this.usuariosRepo.updatePassword(usuarioId, nuevoHash);
        return true;
    }

    editarPerfil = async (
        id: string | undefined,
        body: any,
        archivo?: Express.Multer.File
    ) => {

        if (!id) {
            throw new AppError("ID de usuario no proporcionado", 400);
        }

        const usuario = await this.usuariosRepo.getById(id);

        if (!usuario) {
            throw new AppError("Usuario no encontrado", 404);
        }

        let fotoFinal = usuario.foto;

        /* ¿Subió una foto nueva? */
        if (archivo) {

            // El tipo de archivo ya lo valida upload-middleware (JPEG, PNG o WEBP)
            // y sharp lo convierte siempre a JPEG.
            // Nombre nuevo en cada cambio: si se reusara `${id}.jpg`, la URL no
            // cambiaría y el navegador / la CDN seguirían mostrando la foto vieja.
            const ruta = await StorageHelper.optimizarYSubir(
                archivo.buffer,
                "usuarios",
                `${id}-${randomBytes(6).toString("hex")}.jpg`,
                {
                    width: 400,
                    height: 400,
                    fit: "cover"
                }
            );

            if (!ruta) {
                throw new AppError("No se pudo subir la imagen.", 502);
            }

            fotoFinal = ruta;

        } else if (body.eliminarFoto) {
            fotoFinal = StorageHelper.DEFAULT_USER_PHOTO;
        }

        const nombreFinal = body.nombre ?? usuario.nombre;
        const apellidoFinal = body.apellido ?? usuario.apellido;

        const huboCambios =
            body.nombre !== undefined ||
            body.apellido !== undefined ||
            body.eliminarFoto ||
            body.instituciones_ids !== undefined ||
            archivo !== undefined;

        if (!huboCambios) {
            throw new AppError("Debe modificar al menos un campo.", 400);
        }

        // Si enviaron instituciones_ids, actualizamos las relaciones
        if (body.instituciones_ids !== undefined) {
            await this.usuariosRepo.reemplazarInstituciones(id, body.instituciones_ids);
        }

        let usuarioActualizado;
        try {
            usuarioActualizado = await this.usuariosRepo.updatePerfil(
                id,
                nombreFinal,
                apellidoFinal,
                fotoFinal
            );
        } catch (error) {
            // El perfil no se guardó: la foto recién subida queda sin uso
            if (archivo) await this.borrarFotoAnterior(fotoFinal);
            throw error;
        }

        if (!usuarioActualizado) {
            throw new AppError("No se pudo actualizar el perfil", 500);
        }

        // Con el perfil ya guardado, se borra la foto reemplazada
        if (fotoFinal !== usuario.foto) {
            await this.borrarFotoAnterior(usuario.foto);
        }

        usuarioActualizado.foto = StorageHelper.buildUrl(usuarioActualizado.foto);

        // Obtener la lista actualizada de instituciones para retornar
        const institucionesActuales = (await this.usuariosRepo.getInstitucionesByUsuarioId(id)) || [];

        return {
            ...usuarioActualizado,
            instituciones: institucionesActuales
        };

    };
}

export default new UsuariosService();