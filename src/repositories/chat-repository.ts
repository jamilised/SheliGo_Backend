import DbPg from '../database/db-pg.js';
import { SqlSearchHelper } from '../helpers/sql-search-helper.js';

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

// 4. Trae las salas del usuario con soporte para filtros de lectura Y búsqueda por nombre/apellido
    getSalasPorUsuario = async (usuarioId: string, filtro?: string, busqueda?: string) => {
        let sql = `
            SELECT 
                s.id AS sala_id,
                u.id AS otro_usuario_id,
                u.nombre AS otro_usuario_nombre,
                u.apellido AS otro_usuario_apellido,
                u.foto AS otro_usuario_foto,
                -- Traemos información del último mensaje para ordenar y mostrar en la lista
                (SELECT m.contenido FROM mensajes m WHERE m.sala_id = s.id ORDER BY m.created_at DESC LIMIT 1) AS ultimo_mensaje,
                (SELECT m.created_at FROM mensajes m WHERE m.sala_id = s.id ORDER BY m.created_at DESC LIMIT 1) AS ultimo_mensaje_fecha,
                (SELECT COUNT(*) FROM mensajes m WHERE m.sala_id = s.id AND m.emisor_id != $1 AND m.leido = false) AS mensajes_sin_leer
            FROM salas_chat s
            JOIN participantes_sala p1 ON s.id = p1.sala_id
            JOIN participantes_sala p2 ON s.id = p2.sala_id AND p2.usuario_id != p1.usuario_id
            JOIN usuarios u ON p2.usuario_id = u.id
            WHERE p1.usuario_id = $1
        `;

        const values: any[] = [usuarioId];
        let paramIndex = 2;

        // Cláusula para filtros de lectura
        if (filtro === 'leidas') {
            sql += ` AND (SELECT COUNT(*) FROM mensajes m WHERE m.sala_id = s.id AND m.emisor_id != $1 AND m.leido = false) = 0`;
        } else if (filtro === 'no_leidas') {
            sql += ` AND (SELECT COUNT(*) FROM mensajes m WHERE m.sala_id = s.id AND m.emisor_id != $1 AND m.leido = false) > 0`;
        }

        // 🔥 Agregamos de forma dinámica tu Helper de búsqueda si viene el parámetro
        if (busqueda) {
            const palabrasClave = SqlSearchHelper.prepararPalabrasClaveTsQuery(busqueda);
            
            sql += ` AND (
                to_tsvector('spanish', u.nombre || ' ' || u.apellido) 
                @@ to_tsquery('spanish', $${paramIndex})
            )`;
            
            values.push(palabrasClave);
            paramIndex++;
        }

        sql += ` ORDER BY ultimo_mensaje_fecha DESC NULLS LAST;`;

        return await this.db.queryAll(sql, values);
    };
    
    // ❌ Podés BORRAR por completo el método searchActiveChats de este archivo

    // 8. Elimina un mensaje físico de la DB
    eliminarMensaje = async (mensajeId: string) => {
        const sql = `DELETE FROM mensajes WHERE id = $1 RETURNING id, sala_id;`;
        return await this.db.queryOne(sql, [mensajeId]);
    };

    // 9. Obtener un mensaje por ID (para validar autoría antes de borrar)
    getMensajeById = async (mensajeId: string) => {
        const sql = `SELECT id, emisor_id, sala_id FROM mensajes WHERE id = $1;`;
        return await this.db.queryOne(sql, [mensajeId]);
    };

    // 10. Marcar como leídos los mensajes de una sala recibidos por el usuario
    marcarMensajesComoLeidos = async (salaId: string, usuarioId: string) => {
        const sql = `
            UPDATE mensajes 
            SET leido = true, lectura_at = NOW()
            WHERE sala_id = $1 AND emisor_id != $2 AND leido = false
            RETURNING id, sala_id;
        `;
        return await this.db.queryAll(sql, [salaId, usuarioId]);
    };

}

export default new ChatRepository();