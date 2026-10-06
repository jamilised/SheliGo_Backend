import dbPg from '../database/db-pg.js'

type ArchivoPersistido = {
    id: string;
    publicacion_id: string;
    url: string;
    mime_type: string;
    es_principal: boolean;
    created_at: Date;
};

class PublicacionesRepository {
    db = dbPg;

    createWithFiles = async (
        id: string,
        p: {
            usuario_id: string;
            categoria_id: string;
            institucion_id: string | null;
            nombre: string;
            descripcion: string | null;
            fecha_evento: string;
            tipo: string;
            lugar_institucion: string | null;
            estado: string;
        },
        files: Array<{ url: string; mime_type: string; es_principal: boolean }>
    ) => this.db.transaction(async (client) => {
        const result = await client.query(
            `INSERT INTO publicaciones (
                id, usuario_id, categoria_id, institucion_id, nombre,
                descripcion, fecha_evento, tipo, estado,
                lugar_institucion, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *`,
            [
                id,
                p.usuario_id,
                p.categoria_id,
                p.institucion_id,
                p.nombre,
                p.descripcion,
                p.fecha_evento,
                p.tipo,
                p.estado,
                p.lugar_institucion
            ]
        );
        const publicacion = result.rows[0];
        if (!publicacion) {
            throw new Error('No se pudo insertar la publicación.');
        }

        for (const file of files) {
            await client.query(
                `INSERT INTO archivos (publicacion_id, url, mime_type, es_principal)
                 VALUES ($1, $2, $3, $4)`,
                [id, file.url, file.mime_type, file.es_principal]
            );
        }

        return publicacion;
    });

    updateWithFileChanges = async (
        id: string,
        usuarioId: string,
        p: {
            categoria_id: string;
            institucion_id: string | null;
            nombre: string;
            descripcion: string | null;
            fecha_evento: string;
            tipo: string;
            estado: string;
            lugar_institucion: string | null;
        },
        fileIdsToDelete: string[],
        filesToAdd: Array<{ url: string; mime_type: string; es_principal: boolean }>
    ) => this.db.transaction(async (client) => {
        const updated = await client.query(
            `UPDATE publicaciones
             SET categoria_id = $1, institucion_id = $2, nombre = $3,
                 descripcion = $4, fecha_evento = $5, tipo = $6,
                 estado = $7, lugar_institucion = $8, updated_at = NOW()
             WHERE id = $9 AND usuario_id = $10 AND estado != 'eliminada'
             RETURNING *`,
            [
                p.categoria_id,
                p.institucion_id,
                p.nombre,
                p.descripcion,
                p.fecha_evento,
                p.tipo,
                p.estado,
                p.lugar_institucion,
                id,
                usuarioId
            ]
        );
        const publicacion = updated.rows[0];
        if (!publicacion) return null;

        let archivosEliminados: ArchivoPersistido[] = [];
        if (fileIdsToDelete.length > 0) {
            const deleted = await client.query<ArchivoPersistido>(
                `DELETE FROM archivos a
                 USING publicaciones p
                 WHERE a.id = ANY($1::uuid[])
                   AND a.publicacion_id = $2
                   AND p.id = a.publicacion_id
                   AND p.usuario_id = $3
                 RETURNING a.id, a.publicacion_id, a.url, a.mime_type,
                           a.es_principal, a.created_at`,
                [fileIdsToDelete, id, usuarioId]
            );
            if (deleted.rowCount !== fileIdsToDelete.length) {
                throw new Error('Los archivos a eliminar cambiaron durante la actualización.');
            }
            archivosEliminados = deleted.rows;
        }

        for (const file of filesToAdd) {
            await client.query(
                `INSERT INTO archivos (publicacion_id, url, mime_type, es_principal)
                 VALUES ($1, $2, $3, $4)`,
                [id, file.url, file.mime_type, file.es_principal]
            );
        }

        const files = await client.query<ArchivoPersistido>(
            `SELECT id, publicacion_id, url, mime_type, es_principal, created_at
             FROM archivos
             WHERE publicacion_id = $1
             ORDER BY es_principal DESC, created_at ASC`,
            [id]
        );
        const firstFile = files.rows[0];
        if (firstFile && !files.rows.some((file) => file.es_principal)) {
            await client.query(
                `UPDATE archivos SET es_principal = true WHERE id = $1`,
                [firstFile.id]
            );
            firstFile.es_principal = true;
        }

        return {
            publicacion,
            archivosEliminados,
            archivos: files.rows
        };
    });

    restoreAfterStorageFailure = async (
        id: string,
        original: {
            categoria_id: string;
            institucion_id: string | null;
            nombre: string;
            descripcion: string | null;
            fecha_evento: string;
            tipo: string;
            estado: string;
            lugar_institucion: string | null;
        },
        archivoPrincipalOriginalId: string | null,
        archivosEliminados: ArchivoPersistido[],
        urlsAgregadas: string[]
    ) => this.db.transaction(async (client) => {
        await client.query(
            `UPDATE publicaciones
             SET categoria_id = $1, institucion_id = $2, nombre = $3,
                 descripcion = $4, fecha_evento = $5, tipo = $6,
                 estado = $7, lugar_institucion = $8, updated_at = NOW()
             WHERE id = $9`,
            [
                original.categoria_id,
                original.institucion_id,
                original.nombre,
                original.descripcion,
                original.fecha_evento,
                original.tipo,
                original.estado,
                original.lugar_institucion,
                id
            ]
        );

        if (urlsAgregadas.length > 0) {
            await client.query(
                `DELETE FROM archivos WHERE publicacion_id = $1 AND url = ANY($2::text[])`,
                [id, urlsAgregadas]
            );
        }

        for (const file of archivosEliminados) {
            const restored = await client.query(
                `INSERT INTO archivos (
                    id, publicacion_id, url, mime_type, es_principal, created_at
                 )
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING
                 RETURNING id`,
                [
                    file.id,
                    file.publicacion_id,
                    file.url,
                    file.mime_type,
                    file.es_principal,
                    file.created_at
                ]
            );
            if (restored.rowCount !== 1) {
                throw new Error(`No se pudo restaurar el archivo ${file.id}.`);
            }
        }

        await client.query(
            `UPDATE archivos SET es_principal = false WHERE publicacion_id = $1`,
            [id]
        );
        if (archivoPrincipalOriginalId) {
            const principalRestaurado = await client.query(
                `UPDATE archivos SET es_principal = true
                 WHERE id = $1 AND publicacion_id = $2`,
                [archivoPrincipalOriginalId, id]
            );
            if (principalRestaurado.rowCount !== 1) {
                throw new Error('No se pudo restaurar la imagen principal original.');
            }
        }
    });

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

    // Publicaciones activas más recientes de las instituciones a las que pertenece el usuario
    getRecent = async (usuarioId: string) => {
        const sql = `
            SELECT 
                p.id, 
                p.nombre, 
                p.descripcion, 
                p.fecha_evento,
                p.created_at,
                p.tipo, 
                p.estado,
                p.lugar_institucion,
                p.institucion_id,
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
              AND p.institucion_id IN (
                  SELECT ui.institucion_id
                  FROM usuarios_instituciones ui
                  WHERE ui.usuario_id = $1
              )
            ORDER BY p.fecha_evento DESC, p.created_at DESC
            LIMIT 20
        `;
        return await this.db.queryAll(sql, [usuarioId]);
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
        busqueda?: string | undefined;
        categoria_id?: string[] | undefined;
        institucion_id?: string[] | undefined;
        lugar_institucion?: string | undefined;
        fecha_desde?: string | undefined;
        fecha_hasta?: string | undefined;
        tipo?: string | undefined;
        estado?: string | undefined;
    }) => {
        let sql = `
        SELECT 
            p.id, 
            p.nombre, 
            p.descripcion, 
            p.fecha_evento,
            p.created_at,
            p.tipo, 
            p.estado,
            p.lugar_institucion,
            p.institucion_id,
            p.categoria_id,
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

        if (filtros.categoria_id && filtros.categoria_id.length > 0) {
            sql += ` AND p.categoria_id = ANY($${paramIndex}::uuid[])`;
            values.push(filtros.categoria_id);
            paramIndex++;
        }

        if (filtros.institucion_id && filtros.institucion_id.length > 0) {
            sql += ` AND p.institucion_id = ANY($${paramIndex}::uuid[])`;
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

        sql += ` ORDER BY p.fecha_evento DESC, p.created_at DESC`;
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
            p.created_at,
            p.tipo,
            p.estado,
            p.lugar_institucion,
            p.institucion_id,
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