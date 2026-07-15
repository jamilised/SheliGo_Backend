import { z } from 'zod';

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

const limpiarTexto = (texto?: string) => {
    if (!texto) return null;

    const limpio = texto.trim().replace(/\s+/g, " ");

    return limpio === "" ? null : limpio;
};

export const createPublicacionSchema = z.object({

    nombre: z.string()
        .trim()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(100, "El nombre no puede superar los 100 caracteres")
        .transform(valor => valor.replace(/\s+/g, " ")),


    descripcion: z.string()
        .max(1000, "La descripción no puede superar los 1000 caracteres")
        .optional()
        .transform(limpiarTexto),

    fecha_evento: z.string()
    .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
        "La fecha tiene un formato inválido"
    )
    .refine(valor => !isNaN(Date.parse(valor)), {
        message: "La fecha ingresada no es válida"
    }),

    tipo: z.enum(
        ["perdido", "encontrado"],
        {
            message: "El tipo debe ser perdido o encontrado"
        }
    ),

    categoria_id: z.string()
        .uuid("La categoría es inválida"),

    institucion_id: z.string()
        .uuid("La institución es inválida"),

    lugar_institucion: z.string()
        .max(100)
        .optional()
        .transform(limpiarTexto)
});