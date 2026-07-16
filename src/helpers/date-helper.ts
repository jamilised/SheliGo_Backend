// src/helpers/date-helper.ts
import AppError from '../errors/app-error.js';

export class DateHelper {
    /**
     * Valida que una fecha de inicio no sea posterior a la fecha de fin.
     * Lanza un AppError de nivel 400 si la validación falla.
     */
    static validarRangoFechas(fechaDesde?: string, fechaHasta?: string): void {
        if (fechaDesde && fechaHasta && new Date(fechaDesde) > new Date(fechaHasta)) {
            throw new AppError(
                'La fecha desde no puede ser posterior a la fecha hasta.',
                400
            );
        }
    }
}