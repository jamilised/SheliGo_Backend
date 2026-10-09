import AppError from '../errors/app-error.js';
import type { AdminContext } from '../types/admin-types.js';

/*
Alcance por institución del backoffice. El alcance sale siempre de
AdminContext (armado en admin-middleware leyendo la base); un institucion_id
recibido en la request nunca lo amplía: solo puede acotarlo.
*/
export class AdminAlcanceHelper {
    // 403 si un institution_admin pide una institución que no administra
    static validarInstitucion(ctx: AdminContext, institucionId: string | undefined): void {
        if (institucionId && !ctx.esGlobal && !ctx.institucionesIds.includes(institucionId)) {
            throw new AppError('No tenés permisos sobre esa institución.', 403);
        }
    }

    // Contexto limitado a una sola institución (ya validada), o el original si no se pidió ninguna
    static acotarAInstitucion(ctx: AdminContext, institucionId: string | undefined): AdminContext {
        if (!institucionId) return ctx;
        this.validarInstitucion(ctx, institucionId);
        return { ...ctx, esGlobal: false, institucionesIds: [institucionId] };
    }
}
