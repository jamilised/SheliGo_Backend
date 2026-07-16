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