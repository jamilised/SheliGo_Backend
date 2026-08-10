import ChatRepository from '../repositories/chat-repository.js';
import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js';

class ChatService {
    private chatRepo = ChatRepository;
    private usuariosRepo = UsuariosRepository;

    // Función auxiliar para validar sintaxis de UUID (Lógica pura, se queda en el Service)
    private esUUIDValido = (uuid: string): boolean => {
        const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regexExp.test(uuid);
    };

    // Obtener la lista de chats/salas de un usuario (con filtros y/o búsqueda)
    obtenerMisSalas = async (usuarioId: string, filtro?: string, busqueda?: string) => {
        console.log(`⚡ SERVICIO CHAT: Buscando salas para ${usuarioId}. Filtro: ${filtro || 'ninguno'}, Busqueda: ${busqueda || 'ninguna'}`);
        return await this.chatRepo.getSalasPorUsuario(usuarioId, filtro, busqueda);
    };

    // Obtener o Crear una sala entre el usuario logueado y otro usuario
    obtenerOCrearSala = async (usuarioLogueadoId: string, otroUsuarioId: string) => {
        console.log(`⚡ SERVICIO CHAT: Buscando o creando sala entre ${usuarioLogueadoId} y ${otroUsuarioId}`);

        // 🚨 VALIDACIÓN 1: Sintaxis de UUID de ambos usuarios
        if (!this.esUUIDValido(usuarioLogueadoId) || !this.esUUIDValido(otroUsuarioId)) {
            throw new AppError('El ID de usuario proporcionado no tiene un formato válido.', 400);
        }

        // 🚨 VALIDACIÓN 2: No se puede crear una sala con uno mismo
        if (usuarioLogueadoId === otroUsuarioId) {
            throw new AppError('No podés crear una sala de chat con vos mismo.', 400);
        }

        // 🚨 VALIDACIÓN 3: Capas respetadas. Usamos el repositorio de usuarios para verificar si existe
        const otroUsuario = await this.usuariosRepo.getById(otroUsuarioId);
        if (!otroUsuario) {
            throw new AppError('El usuario con el que intentás chatear no existe.', 404);
        }

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

    // Obtener el historial de mensajes de una sala y marcarlos como leídos
    obtenerMensajesSala = async (salaId: string, usuarioId: string) => {
        console.log(`⚡ SERVICIO CHAT: Cargando mensajes para la sala ${salaId}`);

        if (!this.esUUIDValido(salaId)) {
            throw new AppError('El ID de la sala no es válido.', 400);
        }

        const esMiembro = await this.chatRepo.esParticipante(salaId, usuarioId);
        if (!esMiembro) {
            throw new AppError('No tenés permisos para ver los mensajes de esta sala.', 403);
        }

        // 🚀 MAGIA: En segundo plano marcamos los mensajes que recibió este usuario como leídos
        await this.chatRepo.marcarMensajesComoLeidos(salaId, usuarioId);

        return await this.chatRepo.getMensajesPorSala(salaId);
    };

    // Guardar un mensaje nuevo enviado por el usuario
    guardarMensaje = async (
        salaId: string, 
        emisorId: string, 
        contenido?: string, 
        archivoFoto?: Express.Multer.File
    ) => {
        console.log(`⚡ SERVICIO CHAT: Guardando nuevo mensaje en sala ${salaId}`);

        if (!this.esUUIDValido(salaId)) {
            throw new AppError('El ID de la sala no es válido.', 400);
        }

        // 🚨 Validar que el mensaje tenga o contenido de texto o una foto
        const tieneTexto = contenido && contenido.trim().length > 0;
        const tieneFoto = !!archivoFoto;

        if (!tieneTexto && !tieneFoto) {
            throw new AppError('El mensaje debe contener texto o una imagen.', 400);
        }

        const esMiembro = await this.chatRepo.esParticipante(salaId, emisorId);
        if (!esMiembro) {
            throw new AppError('No podés enviar mensajes a una sala a la que no pertenecés.', 403);
        }

        let contenidoFinal = contenido ? contenido.trim() : '';

        // 🖼️ Si mandaron foto, la procesamos y guardamos la ruta relativa
        if (tieneFoto) {
            const nombreArchivoUnico = `chat-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;

            // Subimos al bucket/carpeta 'chats'
            const fotoPath = await StorageHelper.optimizarYSubir(
                archivoFoto.buffer,
                'chats',
                nombreArchivoUnico
            );

            if (!fotoPath) {
                throw new AppError('Error al procesar o subir la imagen del chat. Verifica que el archivo sea una imagen válida.', 500);
            }

            contenidoFinal = fotoPath; // Se guarda como: chats/chat-1786...jpg
        }

        const mensajeCreado = await this.chatRepo.enviarMensaje(salaId, emisorId, contenidoFinal);

        // Si el contenido subido es una foto, formateamos o adjuntamos la URL completa para el cliente
        if (tieneFoto) {
            mensajeCreado.contenido_url = StorageHelper.buildUrl(mensajeCreado.contenido);
        }

        return mensajeCreado;
    };

    // Eliminar un mensaje validando que el emisor sea el dueño
    eliminarMensaje = async (mensajeId: string, usuarioId: string) => {
        console.log(`⚡ SERVICIO CHAT: Intentando eliminar mensaje ${mensajeId} por usuario ${usuarioId}`);

        if (!this.esUUIDValido(mensajeId)) {
            throw new AppError('El ID del mensaje no es válido.', 400);
        }

        const mensaje = await this.chatRepo.getMensajeById(mensajeId);
        if (!mensaje) {
            throw new AppError('El mensaje que intentás eliminar no existe.', 404);
        }

        if (mensaje.emisor_id !== usuarioId) {
            throw new AppError('No tenés permisos para eliminar este mensaje.', 403);
        }

        return await this.chatRepo.eliminarMensaje(mensajeId);
    };
}

export default new ChatService();