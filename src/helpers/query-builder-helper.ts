// src/helpers/query-builder-helper.ts

export class QueryBuilderHelper {
    /**
     * Agrega un filtro básico de igualdad a la query de forma segura
     */
    static agregarFiltroIgualdad(
        columna: string, 
        valor: any, 
        sql: string, 
        values: any[], 
        paramIndex: number
    ): { sql: string; paramIndex: number } {
        if (valor !== undefined && valor !== null) {
            sql += ` AND ${columna} = $${paramIndex}`;
            values.push(valor);
            paramIndex++;
        }
        return { sql, paramIndex };
    }

    /**
     * Agrega un filtro de rango de fechas
     */
    static agregarFiltroRangoFechas(
        columnaFecha: string,
        fechaDesde: string | undefined,
        fechaHasta: string | undefined,
        sql: string,
        values: any[],
        paramIndex: number
    ): { sql: string; paramIndex: number } {
        if (fechaDesde) {
            sql += ` AND ${columnaFecha}::date >= $${paramIndex}::date`;
            values.push(fechaDesde);
            paramIndex++;
        }
        if (fechaHasta) {
            sql += ` AND ${columnaFecha}::date <= $${paramIndex}::date`;
            values.push(fechaHasta);
            paramIndex++;
        }
        return { sql, paramIndex };
    }
}