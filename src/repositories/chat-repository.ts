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

    // 4. Trae las salas del usuario con soporte para filtrar leídos / no leídos
    getSalasPorUsuario = async (usuarioId: string, filtro?: string) => {
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

        // Aplicamos el filtro si viene
        if (filtro === 'leidas') {
            sql += ` AND (SELECT COUNT(*) FROM mensajes m WHERE m.sala_id = s.id AND m.emisor_id != $1 AND m.leido = false) = 0`;
        } else if (filtro === 'no_leidas') {
            sql += ` AND (SELECT COUNT(*) FROM mensajes m WHERE m.sala_id = s.id AND m.emisor_id != $1 AND m.leido = false) > 0`;
        }

        sql += ` ORDER BY ultimo_mensaje_fecha DESC NULLS LAST;`;

        return await this.db.queryAll(sql, [usuarioId]);
    };

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

    searchActiveChats = async (usuarioId: string, busqueda?: string) => {
        console.log('EJECUTANDO: searchActiveChats con tablas reales. Usuario:', usuarioId, 'Busqueda:', busqueda);

        // 1. Query con CTE (WITH) para armar las salas activas y buscar el último mensaje de cada una
        let sql = `
        WITH participantes_salas AS (
            -- Obtenemos los IDs de las personas que hablan en cada sala
            SELECT DISTINCT sala_id, emisor_id AS participante_id
            FROM mensajes
        ),
        salas_del_usuario AS (
            -- Filtramos solo las salas donde participa el usuario logueado
            SELECT DISTINCT sala_id 
            FROM participantes_salas 
            WHERE participante_id = $1
        ),
        ultimos_mensajes AS (
            -- Obtenemos el último mensaje de cada sala para mostrar el "contenido" en la lista
            SELECT DISTINCT ON (sala_id) id, sala_id, emisor_id, contenido, created_at, leido
            FROM mensajes
            ORDER BY sala_id, created_at DESC
        )
        SELECT 
            s.id AS sala_id,
            m.contenido AS ultimo_mensaje,
            m.created_at AS ultimo_mensaje_at,
            m.leido AS ultimo_mensaje_leido,
            m.emisor_id AS ultimo_mensaje_emisor_id,
            u_otro.id AS otro_usuario_id,
            u_otro.nombre AS otro_usuario_nombre,
            u_otro.apellido AS otro_usuario_apellido
        FROM salas_del_usuario su
        JOIN salas_chat s ON s.id = su.sala_id
        JOIN ultimos_mensajes m ON m.sala_id = s.id
        -- Buscamos al OTRO participante de la sala (el que no es el usuario logueado)
        JOIN participantes_salas p_otro ON p_otro.sala_id = s.id AND p_otro.participante_id <> $1
        JOIN usuarios u_otro ON u_otro.id = p_otro.participante_id
        WHERE 1=1
    `;

        const values: any[] = [usuarioId]; // $1 siempre es el usuario logueado
        let paramIndex = 2;

        // 2. ¡Aplicamos tu Helper de Búsqueda de Texto en el nombre/apellido del otro usuario!
        if (busqueda) {
            const palabrasClave = SqlSearchHelper.prepararPalabrasClaveTsQuery(busqueda);

            sql += ` AND (
            to_tsvector('spanish', u_otro.nombre || ' ' || u_otro.apellido) 
            @@ to_tsquery('spanish', $${paramIndex})
        )`;

            values.push(palabrasClave);
            paramIndex++;
        }

        // 3. Ordenamos para que las salas con mensajes más recientes aparezcan primero arriba
        sql += ` ORDER BY m.created_at DESC`;

        return await this.db.queryAll(sql, values);
    };

}

export default new ChatRepository();