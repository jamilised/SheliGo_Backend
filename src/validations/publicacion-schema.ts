import { z } from 'zod'

export const getPublicacionSchema = z.object({
  id: z.string().uuid()
})

export const searchPublicacionSchema = z.object({
    busqueda: z.string().optional(),
    categoria_id: z.string().uuid('ID de categoría inválido').optional(),
    institucion_id: z.string().uuid('ID de institución inválido').optional(),
    lugar_institucion: z.string().optional(),
    
    // 🚀 Cambiamos la validación de la fecha por esta súper segura:
    fecha: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD')
        .refine((val) => {
            const fechaParseada = Date.parse(val);
            return !isNaN(fechaParseada); // Devuelve false si la fecha no es real (ej: mes 18 o día 40)
        }, { message: 'La fecha ingresada no es una fecha válida en el calendario' })
        .optional(),
        
    tipo: z.enum(['perdido', 'encontrado'], { message: 'El tipo debe ser perdido o encontrado' }).optional(),
});