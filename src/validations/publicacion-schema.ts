import { z } from 'zod'

export const getPublicacionSchema = z.object({
  id: z.string().uuid()
})

export const searchPublicacionSchema = z.object({
    busqueda: z.string().optional(),
    categoria_id: z.string().uuid('ID de categoría inválido').optional(),
    institucion_id: z.string().uuid('ID de institución inválido').optional(),
    lugar_institucion: z.string().optional(),
    // Valida que venga como YYYY-MM-DD
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD').optional(),
    tipo: z.enum(['perdido', 'encontrado'], { message: 'El tipo debe ser perdido o encontrado' }).optional(),
});