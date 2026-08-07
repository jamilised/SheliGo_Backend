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

// Cambiá la función para que acepte también el tipo null 
const limpiarTexto = (texto?: string | null) => {
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

// Al final de tu archivo de esquemas de publicación...

export const updatePublicacionSchema = createPublicacionSchema.partial().extend({
    // Si mandan el nombre para editar, tiene que cumplir sí o sí con las reglas de creación
    nombre: z.string()
        .trim()
        .min(3, "El nombre editado debe tener al menos 3 caracteres")
        .max(100, "El nombre no puede superar los 100 caracteres")
        .transform(valor => valor.replace(/\s+/g, " "))
        .optional(),

    // Permitimos explícitamente que la institución e institución_id puedan ser nulas 
    institucion_id: z.string().uuid("La institución es inválida").nullable().optional(),
    lugar_institucion: z.string().max(100).nullable().optional().transform(limpiarTexto),
    descripcion: z.string().max(1000, "La descripción no puede superar los 1000 caracteres").nullable().optional().transform(limpiarTexto),

    // 🔥 AGREGÁ ESTA LÍNEA ACÁ PARA QUE ZOD NO LO BORRE:
    fotosAEliminar: z.union([z.string(), z.array(z.string())]).optional()
});