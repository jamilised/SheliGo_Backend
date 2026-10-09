import NotificacionesRepository
    from '../repositories/notificaciones-repository.js';
import NotFoundError
    from "../errors/not-found-error.js";

class NotificacionesService {

    private repository =
        NotificacionesRepository;

    crearNotificacion = async (data: {
        usuario_id: string;
        publicacion_id?: string | null;
        tipo: string;
        titulo: string;
        contenido: string;
    }) => {

        // Las notificaciones son un efecto secundario: si fallan no deben
        // romper la acción principal (crear pregunta, enviar mensaje, etc.).
        try {
            return await this.repository.create(data);
        } catch (error) {
            console.error(
                `No se pudo crear la notificación "${data.tipo}" para el usuario ${data.usuario_id}.`,
                error
            );
            return null;
        }

    };

    getMisNotificaciones = async (
        usuarioId: string
    ) => {

        return await this.repository
            .getByUsuarioId(usuarioId);

    };

    marcarComoLeida = async (
        notificacionId: string,
        usuarioId: string
    ) => {

        const notificacion =
            await this.repository.markAsRead(
                notificacionId,
                usuarioId
            );

        if (!notificacion) {
            throw new NotFoundError(
                "Notificación no encontrada"
            );
        }

        return notificacion;

    };

    marcarTodasComoLeidas = async (
        usuarioId: string
    ) => {

        const notificaciones =
            await this.repository.markAllAsRead(
                usuarioId
            ) ?? [];

        return {
            cantidad: notificaciones.length
        };

    };

}

export default new NotificacionesService();