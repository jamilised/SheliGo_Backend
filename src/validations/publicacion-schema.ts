import { z } from 'zod'

export const getPublicacionSchema = z.object({
  id: z.string().uuid()
})

// Validación base reutilizable para no repetir código de fecha dos veces ✨
const fechaValidacion = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD')
    .refine((val) => {
        const fechaParseada = Date.parse(val);
        return !isNaN(fechaParseada);
    }, { message: 'La fecha ingresada no es una fecha válida en el calendario' })
    .optional();

export const searchPublicacionSchema = z.object({
    busqueda: z.string().optional(),
    categoria_id: z.string().uuid('ID de categoría inválido').optional(),
    institucion_id: z.string().uuid('ID de institución inválido').optional(),
    lugar_institucion: z.string().optional(),
    
    // 🔽 Reemplazamos 'fecha' por el rango:
    fecha_desde: fechaValidacion,
    fecha_hasta: fechaValidacion,
        
    tipo: z.enum(['perdido', 'encontrado'], { message: 'El tipo debe ser perdido o encontrado' }).optional(),
});