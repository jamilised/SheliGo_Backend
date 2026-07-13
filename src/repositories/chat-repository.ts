import DbPg from '../database/db-pg.js';

class ChatRepository {
    db = new DbPg();

    // 1. Busca si ya existe una sala común entre dos usuarios (para no duplicar chats de a dos)
    buscarSalaCompartida = async (usuarioA: string, usuarioB: string) => {
        const sql = `
            SELECT p1.sala_id 
            FROM participantes_sala p1
            JOIN participantes_sala p2 ON p1.sala_id = p2.sala_id
            WHERE p1.usuario_id = $1 AND p2.usuario_id = $2
            LIMIT 1;
        `;
        return await this.db.queryOne(sql, [usuarioA, usuarioB]);
    };

    // 2. Crea una sala de chat nueva
    crearSala = async () => {
        const sql = `INSERT INTO salas_chat (created_at) VALUES (NOW()) RETURNING id;`;
        return await this.db.queryOne(sql, []);
    };

    // 3. Une a un usuario a una sala específica
    agregarParticipante = async (salaId: string, usuarioId: string) => {
        const sql = `INSERT INTO participantes_sala (sala_id, usuario_id) VALUES ($1, $2);`;
        return await this.db.queryOne(sql, [salaId, usuarioId]);
    };

    // 4. Trae todas las salas de un usuario con los datos de la OTRA persona (para armar la lista tipo WhatsApp)
    getSalasPorUsuario = async (usuarioId: string) => {
        const sql = `
            SELECT 
                s.id AS sala_id,
                u.id AS otro_usuario_id,
                u.nombre AS otro_usuario_nombre,
                u.apellido AS otro_usuario_apellido,
                u.foto AS otro_usuario_foto
            FROM salas_chat s
            JOIN participantes_sala p1 ON s.id = p1.sala_id
            JOIN participantes_sala p2 ON s.id = p2.sala_id AND p2.usuario_id != p1.usuario_id
            JOIN usuarios u ON p2.usuario_id = u.id
            WHERE p1.usuario_id = $1
            ORDER BY s.created_at DESC;
        `;
        return await this.db.queryAll(sql, [usuarioId]);
    };

    // 5. Trae el historial de mensajes de una sala ordenados cronológicamente
    getMensajesPorSala = async (salaId: string) => {
        const sql = `
            SELECT id, sala_id, emisor_id, contenido, leido, created_at, lectura_at
            FROM mensajes
            WHERE sala_id = $1
            ORDER BY created_at ASC;
        `;
        return await this.db.queryAll(sql, [salaId]);
    };

    // 6. Inserta un mensaje nuevo en la base de datos
    enviarMensaje = async (salaId: string, emisorId: string, contenido: string) => {
        const sql = `
            INSERT INTO mensajes (sala_id, emisor_id, contenido, leido, created_at)
            VALUES ($1, $2, $3, false, NOW())
            RETURNING id, sala_id, emisor_id, contenido, leido, created_at;
        `;
        return await this.db.queryOne(sql, [salaId, emisorId, contenido]);
    };

    // 7. Verifica si un usuario realmente pertenece a una sala (por seguridad)
    esParticipante = async (salaId: string, usuarioId: string) => {
        const sql = `SELECT 1 FROM participantes_sala WHERE sala_id = $1 AND usuario_id = $2;`;
        const res = await this.db.queryOne(sql, [salaId, usuarioId]);
        return !!res;
    };
}

export default new ChatRepository();