import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js'
import { StorageHelper } from '../helpers/storage-helper.js';
import path from "path";

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
