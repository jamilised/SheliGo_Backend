import PublicacionesRepository from '../repositories/publicaciones-repository.js'
import NotFoundError from '../errors/not-found-error.js'
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';

class PublicacionesService {

    repository = new PublicacionesRepository()

    getDetalle = async (id: string) => {

        const publicacion =
            await this.repository.getById(id)

        if (!publicacion) {
            throw new NotFoundError(
                'Publicación no encontrada'
            )
        }

        publicacion.usuario_foto =
        StorageHelper.buildUrl(
            publicacion.usuario_foto
        )

        return publicacion

    }

    getRecentPublicaciones = async () => {
        const publicaciones = await this.repository.getRecent();

        if (publicaciones === null) {
            throw new AppError('Error al recuperar las publicaciones recientes', 500);
        }

        // Mapeamos el array para transformar la URL de cada publicación
        const publicacionesConUrlCompleta = publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildUrl(pub.foto_principal_url);
            return pub;
        })
        
        return publicacionesConUrlCompleta;
    };

}

export default new PublicacionesService()