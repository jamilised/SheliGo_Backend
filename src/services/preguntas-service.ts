import PreguntasRepository
from '../repositories/preguntas-repository.js'

class PreguntasService {

    repository =
        new PreguntasRepository()

    getPreguntas = async (
        publicacionId: string
    ) => {

        return await this.repository
            .getByPublicacionId(
                publicacionId
            )

    }

    createPregunta = async (
        publicacionId: string,
        usuarioId: string,
        contenido: string
    ) => {

        return await this.repository
            .create(
                publicacionId,
                usuarioId,
                contenido
            )

    }

}

export default new PreguntasService()