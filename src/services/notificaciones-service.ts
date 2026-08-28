import NotificacionesRepository
    from '../repositories/notificaciones-repository.js';

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

        const notificacion =
            await this.repository.create(data);

        return notificacion;

    };

}

export default new NotificacionesService();