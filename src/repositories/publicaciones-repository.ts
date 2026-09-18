import DbPg from '../database/db-pg.js'

class PublicacionesRepository {
    db = new DbPg();

    getById = async (id: string) => {
        const sql = `
        SELECT
            p.*,
            u.nombre AS usuario_nombre,
            u.apellido AS usuario_apellido,
            u.foto AS usuario_foto,
            c.nombre AS categoria_nombre,
            i.nombre AS institucion_nombre,
            i.direccion AS institucion_direccion,
            i.latitud,
            i.longitud
        FROM publicaciones p
        INNER JOIN usuarios u
            ON u.id = p.usuario_id
        LEFT JOIN categorias c
            ON c.id = p.categoria_id
        LEFT JOIN instituciones i
            ON i.id = p.institucion_id
        WHERE p.id = $1 AND p.estado != 'eliminada'
    `;
        return await this.db.queryOne(sql, [id]);
    };

    getRecent = async () => {
        const sql = `
            SELECT 
                p.id, 
                p.nombre, 
                p.descripcion, 
                p.fecha_evento,
                p.tipo, 
                p.estado,
                p.lugar_institucion,
                i.nombre AS institucion_nombre,
                i.direccion AS institucion_direccion,
                a.url AS foto_principal_url,
                a.mime_type AS foto_principal_mime_type
            FROM publicaciones p
            LEFT JOIN instituciones i 
                ON i.id = p.institucion_id
            LEFT JOIN LATERAL (
                SELECT url, mime_type
                FROM archivos
                WHERE publicacion_id = p.id
                ORDER BY es_principal DESC, created_at DESC
                LIMIT 1
            ) a ON true
            WHERE p.estado = 'activa'
            ORDER BY p.fecha_evento DESC 
            LIMIT 15
        `;
        return await this.db.queryAll(sql);
    };

    // Soft delete: Cambia el estado a 'eliminada'
    delete = async (id: string) => {
        const sql = `
            UPDATE publicaciones
            SET estado = 'eliminada', updated_at = NOW()
            WHERE id = $1
            RETURNING id, estado
        `;
        return await this.db.queryOne(sql, [id]);
    };

    // Actualiza únicamente el estado
    updateEstado = async (id: string, estado: string) => {
        const sql = `
            UPDATE publicaciones
            SET estado = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        return await this.db.queryOne(sql, [estado, id]);
    };

    search = async (filtros: {
        busqueda?: string;
        categoria_id?: string;
        institucion_id?: string;
        lugar_institucion?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
        tipo?: string;
        estado?: string;
    }) => {
        let sql = `
        SELECT 
            p.id, 
            p.nombre, 
            p.descripcion, 
            p.fecha_evento,
            p.tipo, 
            p.estado,
            p.lugar_institucion,
            i.nombre AS institucion_nombre,
            i.direccion AS institucion_direccion,
            c.nombre AS categoria_nombre,
            a.url AS foto_principal_url,
            a.mime_type AS foto_principal_mime_type
        FROM publicaciones p
        LEFT JOIN instituciones i ON i.id = p.institucion_id
        LEFT JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN LATERAL (
            SELECT url, mime_type
            FROM archivos
            WHERE publicacion_id = p.id
            ORDER BY es_principal DESC, created_at DESC
            LIMIT 1
        ) a ON true
        WHERE p.estado != 'eliminada'
    `;

        const values: any[] = [];
        let paramIndex = 1;

        if (!filtros.estado) {
            sql += ` AND p.estado = 'activa'`;
        } else if (filtros.estado === 'activa' || filtros.estado === 'recuperada') {
            // Solo permitimos filtrar por 'activa' o 'recuperada'
            sql += ` AND p.estado = $${paramIndex}`;
            values.push(filtros.estado);
            paramIndex++;
        } else {
            // Si intenta pasar 'eliminada', forzamos a que no traiga resultados de eliminadas
            sql += ` AND p.estado = 'ninguno'`;
        }

        if (filtros.busqueda) {
            const palabrasClave = filtros.busqueda
                .trim()
                .split(/\s+/)
                .map(palabra => `${palabra}:*`)
                .join(' & ');

            sql += ` AND (
            to_tsvector('spanish', p.nombre || ' ' || COALESCE(p.descripcion, '')) 
            @@ to_tsquery('spanish', $${paramIndex})
        )`;
            values.push(palabrasClave);
            paramIndex++;
        }

        if (filtros.categoria_id) {
            sql += ` AND p.categoria_id = $${paramIndex}`;
            values.push(filtros.categoria_id);
            paramIndex++;
        }

        if (filtros.institucion_id) {
            sql += ` AND p.institucion_id = $${paramIndex}`;
            values.push(filtros.institucion_id);
            paramIndex++;
        }

        if (filtros.lugar_institucion) {
            sql += ` AND p.lugar_institucion ILIKE $${paramIndex}`;
            values.push(`%${filtros.lugar_institucion}%`);
            paramIndex++;
        }

        if (filtros.tipo) {
            sql += ` AND p.tipo = $${paramIndex}`;
            values.push(filtros.tipo);
            paramIndex++;
        }

        if (filtros.fecha_desde) {
            sql += ` AND p.fecha_evento::date >= $${paramIndex}::date`;
            values.push(filtros.fecha_desde);
            paramIndex++;
        }

        if (filtros.fecha_hasta) {
            sql += ` AND p.fecha_evento::date <= $${paramIndex}::date`;
            values.push(filtros.fecha_hasta);
            paramIndex++;
        }

        sql += ` ORDER BY p.fecha_evento DESC`;
        return await this.db.queryAll(sql, values);
    };

    create = async (p: {
        usuario_id: string;
        categoria_id: string;
        institucion_id: string | null;
        nombre: string;
        descripcion: string;
        fecha_evento: string;
        tipo: string;
        lugar_institucion: string | null;
        estado: string;
    }) => {
        const sql = `
        INSERT INTO publicaciones
        (
            usuario_id, categoria_id, institucion_id, nombre,
            descripcion, fecha_evento, tipo, estado,
            lugar_institucion, created_at, updated_at
        )
        VALUES
        (
            $1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW()
        )
        RETURNING *
    `;
        return await this.db.queryOne(sql, [
            p.usuario_id,
            p.categoria_id,
            p.institucion_id,
            p.nombre,
            p.descripcion,
            p.fecha_evento,
            p.tipo,
            p.estado,
            p.lugar_institucion
        ]);
    };

    getByUsuarioId = async (usuarioId: string) => {
        const sql = `
        SELECT
            p.id,
            p.nombre,
            p.descripcion,
            p.fecha_evento,
            p.tipo,
            p.estado,
            p.lugar_institucion,
            c.nombre AS categoria_nombre,
            i.nombre AS institucion_nombre,
            i.direccion AS institucion_direccion,
            a.url AS foto_principal_url,
            a.mime_type AS foto_principal_mime_type
        FROM publicaciones p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN instituciones i ON i.id = p.institucion_id
        LEFT JOIN LATERAL (
            SELECT url, mime_type
            FROM archivos
            WHERE publicacion_id = p.id
            ORDER BY es_principal DESC, created_at DESC
            LIMIT 1
        ) a ON true
        WHERE p.usuario_id = $1 AND p.estado != 'eliminada'
        ORDER BY p.created_at DESC
    `;
        return await this.db.queryAll(sql, [usuarioId]);
    };

    update = async (id: string, p: {
        categoria_id: string;
        institucion_id: string | null;
        nombre: string;
        descripcion: string | null;
        fecha_evento: string;
        tipo: string;
        estado: string;
        lugar_institucion: string | null;
    }) => {
        const sql = `
            UPDATE publicaciones
            SET 
                categoria_id = $1,
                institucion_id = $2,
                nombre = $3,
                descripcion = $4,
                fecha_evento = $5,
                tipo = $6,
                estado = $7,
                lugar_institucion = $8,
                updated_at = NOW()
            WHERE id = $9 AND estado != 'eliminada'
            RETURNING *
        `;
        return await this.db.queryOne(sql, [
            p.categoria_id,
            p.institucion_id,
            p.nombre,
            p.descripcion,
            p.fecha_evento,
            p.tipo,
            p.estado,
            p.lugar_institucion,
            id
        ]);
    };
}

export default new PublicacionesRepository();