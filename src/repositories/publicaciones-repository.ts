import DbPg from '../database/db-pg.js'
import { SqlSearchHelper } from '../helpers/sql-search-helper.js';
import { QueryBuilderHelper } from '../helpers/query-builder-helper.js';

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

    delete = async (id: string) => {

        const sql = `
            DELETE FROM publicaciones
            WHERE id = $1
            RETURNING id
        `;

        return await this.db.queryOne(sql, [id]);

    }

search = async (filtros: {
    busqueda?: string;
    categoria_id?: string;
    institucion_id?: string;
    lugar_institucion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo?: string;
}) => {
    let sql = `
        SELECT 
            p.id, p.nombre, p.descripcion, p.fecha_evento, p.tipo, p.estado, p.lugar_institucion,
            i.nombre AS institucion_nombre, i.direccion AS institucion_direccion,
            c.nombre AS categoria_nombre, a.url AS foto_principal_url
        FROM publicaciones p
        LEFT JOIN instituciones i ON i.id = p.institucion_id
        LEFT JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN LATERAL (
            SELECT url FROM archivos WHERE publicacion_id = p.id ORDER BY es_principal DESC LIMIT 1
        ) a ON true
        WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    // 1. Filtro complejo de texto (Full Text Search)
    if (filtros.busqueda) {
        const palabrasClave = SqlSearchHelper.prepararPalabrasClaveTsQuery(filtros.busqueda);
        sql += ` AND (to_tsvector('spanish', p.nombre || ' ' || COALESCE(p.descripcion, '')) @@ to_tsquery('spanish', $${paramIndex}))`;
        values.push(palabrasClave);
        paramIndex++;
    }

    // 2. Filtros de igualdad limpios usando el Helper (sirve para Categorías, Instituciones, Tipo, etc.)
    ({ sql, paramIndex } = QueryBuilderHelper.agregarFiltroIgualdad('p.categoria_id', filtros.categoria_id, sql, values, paramIndex));
    ({ sql, paramIndex } = QueryBuilderHelper.agregarFiltroIgualdad('p.institucion_id', filtros.institucion_id, sql, values, paramIndex));
    ({ sql, paramIndex } = QueryBuilderHelper.agregarFiltroIgualdad('p.tipo', filtros.tipo, sql, values, paramIndex));

    // 3. Filtro específico de ILIKE para lugar_institucion
    if (filtros.lugar_institucion) {
        sql += ` AND p.lugar_institucion ILIKE $${paramIndex}`;
        values.push(`%${filtros.lugar_institucion}%`);
        paramIndex++;
    }

    // 4. Filtro de Fechas Dinámico usando el Helper
    ({ sql, paramIndex } = QueryBuilderHelper.agregarFiltroRangoFechas('p.fecha_evento', filtros.fecha_desde, filtros.fecha_hasta, sql, values, paramIndex));

    sql += ` ORDER BY p.fecha_evento DESC`;

    return await this.db.queryAll(sql, values);
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
            estado,
            lugar_institucion,
            created_at,
            updated_at
        )
        VALUES
        (
            $1,$2,$3,$4,$5,$6,$7,$8, $9, NOW(), NOW()
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
    }
    
    // Editar una publicación existente
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
            WHERE id = $9
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

export default new PublicacionesRepository