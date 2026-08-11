import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js'
import { StorageHelper } from '../helpers/storage-helper.js';
import path from "path";
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

    editarPerfil = async (
        id: string | undefined,
        body: any,
        files: any
    ) => {

        console.log(body);
        console.log(files);

        if (!id) {
            throw new AppError(
                "ID de usuario no proporcionado",
                400
            );
        }

        const usuario = await this.usuariosRepo.getById(id);

        if (!usuario) {
            throw new AppError(
                "Usuario no encontrado",
                404
            );
        }

        let fotoFinal = usuario.foto;

        /*
        ¿Subió una foto nueva?
        */

        if (files && files.length > 0) {

            const archivo = files[0];

            const extensionesPermitidas = [
                ".jpg",
                ".jpeg",
                ".png",
                ".jfif"
            ];

            const extension = path
                .extname(archivo.originalname)
                .toLowerCase();

            if (!extensionesPermitidas.includes(extension)) {
                throw new AppError(
                    "Formato de imagen no permitido. Solo se permiten JPG, JPEG, PNG y JFIF.",
                    400
                );
            }

            const ruta = await StorageHelper.optimizarYSubir(
                archivo.buffer,
                "usuarios",
                `${id}.jpg`,
                {
                    width: 400,
                    height: 400,
                    fit: "cover"
                }
            );

            if (!ruta) {
                throw new AppError(
                    "No se pudo subir la imagen.",
                    500
                );
            }

            fotoFinal = ruta;

        }        /*
        ¿Pidió eliminar la foto?
        */

        else if (body.eliminarFoto) {

            fotoFinal = "usuarios/default.png";

        }

        const nombreFinal =
            body.nombre ?? usuario.nombre;

        const apellidoFinal =
            body.apellido ?? usuario.apellido;

        const huboCambios =
            body.nombre !== undefined ||
            body.apellido !== undefined ||
            body.eliminarFoto ||
            (files && files.length > 0);

        if (!huboCambios) {
            throw new AppError(
                "Debe modificar al menos un campo.",
                400
            );
        }

        const usuarioActualizado =
            await this.usuariosRepo.updatePerfil(
                id,
                nombreFinal,
                apellidoFinal,
                fotoFinal
            );

        if (!usuarioActualizado) {

            throw new AppError(
                "No se pudo actualizar el perfil",
                500
            );

        }

        usuarioActualizado.foto =
            StorageHelper.buildUrl(
                usuarioActualizado.foto
            );

        return usuarioActualizado;

    };
}

export default new UsuariosService();
