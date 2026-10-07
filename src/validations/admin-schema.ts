import { z } from 'zod';
import { ESTADOS_PUBLICACION, ROLES, TIPOS_PUBLICACION } from '../types/admin-types.js';

/*
Validaciones del backoffice. Las listas son paginadas del lado del servidor:
?page=1&limit=20&search=texto
*/

// Un query param vacío (?search=) se trata como ausente
const vacioComoAusente = (valor: unknown) =>
    typeof valor === 'string' && valor.trim() === '' ? undefined : valor;

const paginacion = {
    page: z.preprocess(
        vacioComoAusente,
        z.coerce.number().int('La página debe ser un número entero').min(1, 'La página mínima es 1').default(1)
    ),
    limit: z.preprocess(
        vacioComoAusente,
        z.coerce.number().int('El límite debe ser un número entero')
            .min(1, 'El límite mínimo es 1')
            .max(100, 'El límite máximo es 100')
            .default(20)
    ),
    search: z.preprocess(
        vacioComoAusente,
        z.string().trim().max(100, 'La búsqueda no puede superar 100 caracteres').optional()
    )
};

const uuidOpcional = (mensaje: string) =>
    z.preprocess(vacioComoAusente, z.string().uuid(mensaje).optional());

export const adminIdParamsSchema = z.object({
    id: z.string().uuid('El identificador no es válido')
});

// ---------- Usuarios ----------

export const adminUsuariosQuerySchema = z.object({
    ...paginacion,
    rol: z.preprocess(vacioComoAusente, z.enum(ROLES, { message: 'Rol inválido' }).optional()),
    institucion_id: uuidOpcional('ID de institución inválido')
});
export type AdminUsuariosQuery = z.infer<typeof adminUsuariosQuerySchema>;

const institucionesIds = z.array(z.string().uuid('UUID de institución inválido'))
    .max(50, 'No se pueden seleccionar más de 50 instituciones')
    .transform((ids) => [...new Set(ids)]);

export const adminCambiarRolSchema = z.object({
    rol: z.enum(ROLES, { message: 'Rol inválido' }),
    instituciones_ids: institucionesIds.optional()
}).refine(
    (data) => data.rol !== 'institution_admin' || (data.instituciones_ids?.length ?? 0) > 0,
    { message: 'Un administrador institucional debe tener al menos una institución asignada', path: ['instituciones_ids'] }
);

export const adminInstitucionesUsuarioSchema = z.object({
    instituciones_ids: institucionesIds.refine(
        (ids) => ids.length > 0,
        'El usuario debe pertenecer al menos a una institución'
    )
});

// ---------- Publicaciones ----------

export const adminPublicacionesQuerySchema = z.object({
    ...paginacion,
    estado: z.preprocess(vacioComoAusente, z.enum(ESTADOS_PUBLICACION, { message: 'Estado inválido' }).optional()),
    tipo: z.preprocess(vacioComoAusente, z.enum(TIPOS_PUBLICACION, { message: 'Tipo inválido' }).optional()),
    institucion_id: uuidOpcional('ID de institución inválido'),
    categoria_id: uuidOpcional('ID de categoría inválido'),
    usuario_id: uuidOpcional('ID de usuario inválido')
});
export type AdminPublicacionesQuery = z.infer<typeof adminPublicacionesQuerySchema>;

export const adminCambiarEstadoSchema = z.object({
    estado: z.enum(ESTADOS_PUBLICACION, { message: 'Estado inválido' }),
    // Se guarda en la auditoría para explicar la moderación
    motivo: z.string().trim().max(500, 'El motivo no puede superar 500 caracteres').optional()
});

// ---------- Instituciones ----------

export const adminListaQuerySchema = z.object({ ...paginacion });
export type AdminListaQuery = z.infer<typeof adminListaQuerySchema>;

/*
Los formularios de institución llegan como multipart (pueden traer foto),
así que todos los campos son texto. '' significa "borrar el valor".
*/
const textoNullable = (max: number, mensaje: string) =>
    z.preprocess(
        (valor) => {
            if (typeof valor !== 'string') return valor;
            const limpio = valor.trim().replace(/\s+/g, ' ');
            return limpio === '' ? null : limpio;
        },
        z.string().max(max, mensaje).nullable()
    );

const coordenada = (min: number, max: number, mensaje: string) =>
    z.preprocess(
        (valor) => {
            if (valor === null) return null;
            if (typeof valor !== 'string') return valor;
            return valor.trim() === '' ? null : Number(valor);
        },
        z.number({ message: mensaje }).min(min, mensaje).max(max, mensaje).nullable()
    );

const institucionCampos = {
    nombre: z.string({ message: 'El nombre es obligatorio' })
        .trim()
        .min(2, 'El nombre debe tener entre 2 y 120 caracteres')
        .max(120, 'El nombre debe tener entre 2 y 120 caracteres')
        .transform((valor) => valor.replace(/\s+/g, ' ')),
    email: z.preprocess(
        (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor),
        z.string().trim().toLowerCase().email('El email no es válido').max(120, 'El email es demasiado largo').nullable()
    ),
    direccion: textoNullable(200, 'La dirección no puede superar 200 caracteres'),
    telefono: textoNullable(30, 'El teléfono no puede superar 30 caracteres'),
    latitud: coordenada(-90, 90, 'La latitud debe estar entre -90 y 90'),
    longitud: coordenada(-180, 180, 'La longitud debe estar entre -180 y 180')
};

const coordenadasCompletas = (data: { latitud?: number | null | undefined; longitud?: number | null | undefined }) =>
    (data.latitud === undefined) === (data.longitud === undefined) &&
    (data.latitud === null) === (data.longitud === null);

const mensajeCoordenadas = {
    message: 'La latitud y la longitud se cargan juntas',
    path: ['latitud']
};

export const adminCrearInstitucionSchema = z.object({
    nombre: institucionCampos.nombre,
    email: institucionCampos.email.optional(),
    direccion: institucionCampos.direccion.optional(),
    telefono: institucionCampos.telefono.optional(),
    latitud: institucionCampos.latitud.optional(),
    longitud: institucionCampos.longitud.optional()
}).refine(coordenadasCompletas, mensajeCoordenadas);
export type AdminCrearInstitucion = z.infer<typeof adminCrearInstitucionSchema>;

export const adminEditarInstitucionSchema = z.object({
    nombre: institucionCampos.nombre.optional(),
    email: institucionCampos.email.optional(),
    direccion: institucionCampos.direccion.optional(),
    telefono: institucionCampos.telefono.optional(),
    latitud: institucionCampos.latitud.optional(),
    longitud: institucionCampos.longitud.optional(),
    eliminarFoto: z.preprocess(
        (valor) => valor === true || valor === 'true' || valor === '1',
        z.boolean()
    ).optional()
}).refine(coordenadasCompletas, mensajeCoordenadas);
export type AdminEditarInstitucion = z.infer<typeof adminEditarInstitucionSchema>;

// ---------- Categorías ----------

const categoriaNombre = z.string({ message: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener entre 2 y 60 caracteres')
    .max(60, 'El nombre debe tener entre 2 y 60 caracteres')
    .transform((valor) => valor.replace(/\s+/g, ' '));

const categoriaDescripcion = textoNullable(255, 'La descripción no puede superar 255 caracteres');

export const adminCrearCategoriaSchema = z.object({
    nombre: categoriaNombre,
    descripcion: categoriaDescripcion.optional()
});
export type AdminCrearCategoria = z.infer<typeof adminCrearCategoriaSchema>;

export const adminEditarCategoriaSchema = z.object({
    nombre: categoriaNombre.optional(),
    descripcion: categoriaDescripcion.optional()
}).refine(
    (data) => data.nombre !== undefined || data.descripcion !== undefined,
    { message: 'No se enviaron cambios' }
);
export type AdminEditarCategoria = z.infer<typeof adminEditarCategoriaSchema>;
