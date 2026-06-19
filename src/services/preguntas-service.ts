import PreguntasRepository
    from '../repositories/preguntas-repository.js'
import { StorageHelper } from '../helpers/storage-helper.js'

class PreguntasService {

    repository = PreguntasRepository;

    getPreguntas = async (
        publicacionId: string
    ) => {

        const preguntas =
            await this.repository
                .getByPublicacionId(
                    publicacionId
                ) || []

        return preguntas.map(
            (pregunta: any) => ({

                id: pregunta.id,
                contenido: pregunta.contenido,
                created_at: pregunta.created_at,
                usuario: {
                    id: pregunta.usuario_id,
                    nombre: pregunta.usuario_nombre,
                    apellido: pregunta.usuario_apellido,
                    foto:
                            StorageHelper.buildUrl(
                                pregunta.usuario_foto
                            )
                         },

                respuesta:
                    pregunta.respuesta_id
                        ? {
                            id: pregunta.respuesta_id,
                            contenido: pregunta.respuesta_contenido,
                            created_at: pregunta.respuesta_created_at
                        }
                        : null
            })
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