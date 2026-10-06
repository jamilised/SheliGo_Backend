import { z } from 'zod';

export const getPublicacionSchema = z.object({
    id: z.string().uuid('El ID de la publicación no es válido')
});

const fechaValidacion = z.string()
    .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Formato de fecha debe ser YYYY-MM-DD'
    )
    .refine((val) => {
        const fechaParseada = Date.parse(val);
        return !isNaN(fechaParseada);
    }, {
        message: 'La fecha ingresada no es una fecha válida en el calendario'
    })
    .optional();

/*
Lista de UUID separada por comas (?categoria_id=a,b,c), que es como la envía
el frontend al seleccionar varios filtros. Un único id también es válido.
*/
const uuidListSchema = (mensaje: string) =>
    z.string()
        .transform((valor) =>
            valor.split(',').map((id) => id.trim()).filter(Boolean)
        )
        .pipe(z.array(z.string().uuid(mensaje)).max(50, 'Demasiados filtros seleccionados'))
        .optional();

export const searchPublicacionSchema = z.object({
    busqueda: z.string().trim().max(100, 'La búsqueda no puede superar 100 caracteres').optional(),
    categoria_id: uuidListSchema('ID de categoría inválido'),
    institucion_id: uuidListSchema('ID de institución inválido'),
    lugar_institucion: z.string().trim().max(100, 'El lugar no puede superar 100 caracteres').optional(),
    fecha_desde: fechaValidacion,
    fecha_hasta: fechaValidacion,
    tipo: z.enum(['perdido', 'encontrado'], {
        message: 'El tipo debe ser perdido o encontrado'
    }).optional(),
    estado: z.enum(['activa', 'recuperada', 'eliminada']).optional()
});

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
        .refine(
            valor => !isNaN(Date.parse(valor)),
            { message: "La fecha ingresada no es válida" }
        ),

    tipo: z.enum(["perdido", "encontrado"], {
        message: "El tipo debe ser perdido o encontrado"
    }),

    categoria_id: z.string().uuid("La categoría es inválida"),
    institucion_id: z.string().uuid("La institución es inválida"),
    lugar_institucion: z.string().max(100).optional().transform(limpiarTexto)
});

export const updatePublicacionSchema = createPublicacionSchema
    .partial()
    .extend({
        nombre: z.string()
            .trim()
            .min(3, "El nombre editado debe tener al menos 3 caracteres")
            .max(100, "El nombre no puede superar los 100 caracteres")
            .transform(valor => valor.replace(/\s+/g, " "))
            .optional(),

        institucion_id: z.string()
            .uuid("La institución es inválida")
            .nullable()
            .optional(),

        lugar_institucion: z.string()
            .max(100)
            .nullable()
            .optional()
            .transform(limpiarTexto),

        descripcion: z.string()
            .max(1000, "La descripción no puede superar los 1000 caracteres")
            .nullable()
            .optional()
            .transform(limpiarTexto),

        estado: z.enum(['activa', 'recuperada', 'eliminada'], {
            message: "Estado inválido"
        }).optional(),

        fotosAEliminar: z.union([
            z.array(z.string().uuid()).max(5),
            z.string().transform((value, context) => {
                let parsedValue: unknown;

                try {
                    parsedValue = JSON.parse(value);
                } catch {
                    parsedValue = value;
                }

                const ids = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                const result = z.array(z.string().uuid()).max(5).safeParse(ids);

                if (!result.success) {
                    for (const issue of result.error.issues) {
                        context.addIssue({
                            code: "custom",
                            message: issue.message,
                            path: issue.path
                        });
                    }
                    return z.NEVER;
                }

                return result.data;
            })
        ]).optional()
    });