import PublicacionesRepository from '../repositories/publicaciones.repository.js'
import NotFoundError from '../errors/not-found-error.js'
import AppError from '../errors/app-error.js';

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

        return publicacion

    }

    getRecentPublicaciones = async () => {
        const publicaciones = await this.repository.getRecent();

        if (publicaciones === null) {
            throw new AppError('Error al recuperar las publicaciones recientes', 500);
        }

        return publicaciones;
    };

}

export default new PublicacionesService()