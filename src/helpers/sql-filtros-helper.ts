/**
 * Acumula condiciones WHERE y sus valores para armar consultas dinámicas
 * sin concatenar datos del usuario: cada valor pasa por param(), que lo
 * guarda en values y devuelve su placeholder ($1, $2, ...).
 *
 *   const f = new SqlFiltros();
 *   f.agregar(`p.estado = ${f.param('activa')}`);
 *   db.queryAll(`SELECT ... ${f.where()}`, f.values);
 */
export class SqlFiltros {
    readonly values: unknown[] = [];
    private condiciones: string[] = [];

    param(valor: unknown): string {
        this.values.push(valor);
        return `$${this.values.length}`;
    }

    agregar(condicion: string): void {
        this.condiciones.push(condicion);
    }

    where(): string {
        return this.condiciones.length > 0
            ? `WHERE ${this.condiciones.join(' AND ')}`
            : '';
    }
}
