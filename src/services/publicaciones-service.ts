import PublicacionesRepository from '../repositories/publicaciones-repository.js'
import NotFoundError from '../errors/not-found-error.js'

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

}

export default new PublicacionesService()