/*import PublicacionesRepository from '../repositories/publicaciones.repository.js'
import NotFoundError from '../errors/not-found-error.js'

export default class PublicacionesService {

  repository = new PublicacionesRepository()

  async getDetalle(id: string) {

    const publicacion =
      await this.repository.getById(id)

    if (!publicacion) {
      throw new NotFoundError(
        'Publicación no encontrada'
      )
    }

    return publicacion
  }
}*/

class PublicacionesService {

    getDetalle = async (id: string) => {

        return {
            id,
            nombre: 'Objeto de prueba'
        }

    }

}

export default new PublicacionesService()