import ChatRepository from '../repositories/chat-repository.js';
import AppError from '../errors/app-error.js';

class ChatService {
    private chatRepo = ChatRepository;

    // Obtener o Crear una sala entre el usuario logueado y otro usuario
    obtenerOCrearSala = async (usuarioLogueadoId: string, otroUsuarioId: string) => {
        console.log(`⚡ SERVICIO CHAT: Buscando o creando sala entre ${usuarioLogueadoId} y ${otroUsuarioId}`);

        // 1. Checkear si ya tienen una sala juntos
        const salaExistente = await this.chatRepo.buscarSalaCompartida(usuarioLogueadoId, otroUsuarioId);

        if (salaExistente) {
            console.log(`ℹ️ Ya existe la sala: ${salaExistente.sala_id}`);
            return { sala_id: salaExistente.sala_id };
        }

        // 2. Si no existe, creamos la sala nueva
        console.log(`✨ No existe sala común. Creando sala nueva...`);
        const nuevaSala = await this.chatRepo.crearSala();
        if (!nuevaSala) throw new AppError('No se pudo crear la sala de chat.', 500);

        // 3. Unimos a los dos participantes a la sala
        await this.chatRepo.agregarParticipante(nuevaSala.id, usuarioLogueadoId);
        await this.chatRepo.agregarParticipante(nuevaSala.id, otroUsuarioId);

        return { sala_id: nuevaSala.id };
    };

    // Obtener el historial de mensajes de una sala (Asegurando que el usuario pertenezca a ella)
    obtenerMensajesSala = async (salaId: string, usuarioId: string) => {
        console.log(`⚡ SERVICIO CHAT: Cargando mensajes para la sala ${salaId}`);

        // Seguridad: Validamos que el usuario que pide los mensajes realmente sea miembro de la sala
        const esMiembro = await this.chatRepo.esParticipante(salaId, usuarioId);
        if (!esMiembro) {
            throw new AppError('No tenés permisos para ver los mensajes de esta sala.', 403);
        }

        return await this.chatRepo.getMensajesPorSala(salaId);
    };

    // Guardar un mensaje nuevo enviado por el usuario
    guardarMensaje = async (salaId: string, emisorId: string, contenido: string) => {
        console.log(`⚡ SERVICIO CHAT: Guardando nuevo mensaje en sala ${salaId}`);

        if (!contenido || contenido.trim() === '') {
            throw new AppError('El contenido del mensaje no puede estar vacío.', 400);
        }

        // Seguridad: Validamos que el emisor realmente pertenezca a la sala
        const esMiembro = await this.chatRepo.esParticipante(salaId, emisorId);
        if (!esMiembro) {
            throw new AppError('No podés enviar mensajes a una sala a la que no pertenecés.', 403);
        }

        return await this.chatRepo.enviarMensaje(salaId, emisorId, contenido.trim());
    };

    // Obtener la lista de chats/salas de un usuario con filtros opcionales
    obtenerMisSalas = async (usuarioId: string, filtro?: string) => {
        console.log(`⚡ SERVICIO CHAT: Buscando salas para el usuario ${usuarioId} con filtro: ${filtro || 'todas'}`);
        return await this.chatRepo.getSalasPorUsuario(usuarioId, filtro);
    };

    // Eliminar un mensaje validando que el emisor sea el dueño
    eliminarMensaje = async (mensajeId: string, usuarioId: string) => {
        console.log(`⚡ SERVICIO CHAT: Intentando eliminar mensaje ${mensajeId} por usuario ${usuarioId}`);

        const mensaje = await this.chatRepo.getMensajeById(mensajeId);
        if (!mensaje) {
            throw new AppError('El mensaje que intentás eliminar no existe.', 404);
        }

        // Seguridad: Solo el dueño del mensaje puede borrarlo
        if (mensaje.emisor_id !== usuarioId) {
            throw new AppError('No tenés permisos para eliminar este mensaje.', 403);
        }

        return await this.chatRepo.eliminarMensaje(mensajeId);
    };
}

export default new ChatService();