import DbPg from '../database/db-pg.js'

class PublicacionesRepository {

    db = new DbPg()

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
        WHERE p.id = $1
    `

        const result =
            await this.db.queryOne(sql, [id])

        return result
    }

    getRecent = async () => {
        console.log('EJECUTANDO: getRecent')
        console.log('DB HOST:', process.env.DB_HOST)
        console.log('DB DATABASE:', process.env.DB_DATABASE)
        console.log('DB USER:', process.env.DB_USER)

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
            ORDER BY p.fecha_evento DESC 
            LIMIT 15
        `

        const result =
            await this.db.queryAll(sql)

        console.log('RESULTADO QUERY RECIENTES:', result)

        return result
    }

    search = async (filtros: {
        busqueda?: string;
        categoria_id?: string;
        institucion_id?: string;
        lugar_institucion?: string;
        fecha?: string;
        tipo?: string; // perdido o encontrado
    }) => {
        console.log('EJECUTANDO: search en PublicacionesRepository con filtros:', filtros);

        // 1. La base de la query con los mismos JOINs que usás en getRecent
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
        WHERE 1=1
    `;

        const values: any[] = [];
        let paramIndex = 1;

        // 2. Agregamos los filtros dinámicamente si vienen informados
        if (filtros.busqueda) {
            // 1. Limpiamos espacios de más y unimos las palabras con ':*' para que busque prefijos (ej: 'auricular:*')
            const palabrasClave = filtros.busqueda
                .trim()
                .split(/\s+/)
                .map(palabra => `${palabra}:*`)
                .join(' & ');

            // 2. Usamos to_tsquery para permitir el operador de prefijo :*
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

        if (filtros.fecha) {
            // Filtra por el día específico sin importar la hora exacta
            sql += ` AND p.fecha_evento::date = $${paramIndex}::date`;
            values.push(filtros.fecha);
            paramIndex++;
        }

        // 3. Ordenamos por las más nuevas del evento
        sql += ` ORDER BY p.fecha_evento DESC`;

        // 4. Ejecutamos usando tu helper db
        const result = await this.db.queryAll(sql, values);
        return result;
    }

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
            usuario_id,
            categoria_id,
            institucion_id,
            nombre,
            descripcion,
            fecha_evento,
            tipo,
            lugar_institucion
        )
        VALUES
        (
            $1,$2,$3,$4,$5,$6,$7,$8
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
            p.lugar_institucion
        ]);
    }
}

export default new PublicacionesRepository