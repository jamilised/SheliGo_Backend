export class SqlSearchHelper {
    /**
     * Convierte un string de búsqueda común en una sintaxis válida para to_tsquery de Postgres.
     * Ejemplo: "perro callejero" => "perro:* & callejero:*"
     */
    static prepararPalabrasClaveTsQuery(busqueda: string): string {
        return busqueda
            .trim()
            .split(/\s+/)
            .map(palabra => `${palabra}:*`)
            .join(' & ');
    }
}

/**
 * Arma un patrón seguro para ILIKE: escapa los comodines del usuario
 * (%, _ y \) para que se busquen como texto literal.
 * Ejemplo: "50%" => "%50\%%"
 */
export const buildIlikePattern = (texto: string): string =>
    `%${texto.trim().replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
