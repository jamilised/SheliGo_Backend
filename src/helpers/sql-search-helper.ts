export class SqlSearchHelper {
    /**
     * Convierte un string de búsqueda común en una sintaxis válida para to_tsquery de Postgres.
     * Ejemplo: "perro callejero" => "perro:* & callejero:*"
     * Solo deja letras y números: los operadores de tsquery (& | ! ( ) : ')
     * romperían la consulta. Devuelve null si no queda ninguna palabra.
     */
    static prepararPalabrasClaveTsQuery(busqueda: string): string | null {
        const palabras = busqueda.match(/[\p{L}\p{N}]+/gu) ?? [];
        return palabras.length > 0
            ? palabras.map(palabra => `${palabra}:*`).join(' & ')
            : null;
    }
}

/**
 * Arma un patrón seguro para ILIKE: escapa los comodines del usuario
 * (%, _ y \) para que se busquen como texto literal.
 * Ejemplo: "50%" => "%50\%%"
 */
export const buildIlikePattern = (texto: string): string =>
    `%${texto.trim().replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
