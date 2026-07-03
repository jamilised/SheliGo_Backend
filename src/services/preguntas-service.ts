import PreguntasRepository
    from '../repositories/preguntas-repository.js'
import { StorageHelper } from '../helpers/storage-helper.js'

import PublicacionesRepository
    from "../repositories/publicaciones-repository.js";

import AppError
    from "../errors/app-error.js";

import NotFoundError
    from "../errors/not-found-error.js";

class PreguntasService {

    repository = PreguntasRepository;
    private publicacionesRepository = PublicacionesRepository;

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

    createRespuesta = async (
        preguntaId: string,
        usuarioId: string,
        contenido: string
    ) => {

        const pregunta =
            await this.repository.getById(preguntaId);

        if (!pregunta) {
            throw new NotFoundError(
                "Pregunta no encontrada"
            );
        }

        const publicacion =
            await this.publicacionesRepository.getById(
                pregunta.publicacion_id
            );

        if (!publicacion) {
            throw new NotFoundError(
                "Publicación no encontrada"
            );
        }

        if (publicacion.usuario_id !== usuarioId) {
            throw new AppError(
                "Solo el dueño de la publicación puede responder preguntas.",
                403
            );
        }

        const respuestaExistente =
            await this.repository.existsRespuesta(
                preguntaId
            );

        if (respuestaExistente) {
            throw new AppError(
                "La pregunta ya fue respondida.",
                400
            );
        }

        return await this.repository.createRespuesta(
            preguntaId,
            usuarioId,
            contenido
        );

    }

}

export default new PreguntasService()