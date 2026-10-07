/*
Tipos compartidos del backoffice.

Los roles viven en usuarios.rol (ver migrations/001-backoffice-roles-y-auditoria.sql):
- user: usuario común, sin acceso al backoffice.
- institution_admin: administra solo las instituciones donde
  usuarios_instituciones.es_admin = true.
- admin: administrador general de la plataforma.
*/
export const ROLES = ['user', 'institution_admin', 'admin'] as const;
export type Rol = typeof ROLES[number];

export const ESTADOS_PUBLICACION = ['activa', 'recuperada', 'eliminada'] as const;
export type EstadoPublicacion = typeof ESTADOS_PUBLICACION[number];

export const TIPOS_PUBLICACION = ['perdido', 'encontrado'] as const;

/*
Contexto que deja admin-middleware en res.locals.admin. Se arma leyendo la
base en cada request (el JWT solo trae userId), así que un cambio de rol
tiene efecto inmediato sin esperar a que expire el token.
*/
export type AdminContext = {
    id: string;
    rol: 'admin' | 'institution_admin';
    // true solo para el rol admin: sin restricción por institución
    esGlobal: boolean;
    // Instituciones administradas. Vacío cuando esGlobal es true.
    institucionesIds: string[];
};

// Formato estándar de las respuestas paginadas del backoffice
export type Paginado<T> = {
    items: T[];
    page: number;
    limit: number;
    total: number;
    total_pages: number;
};

// Datos comunes que cualquier acción auditada necesita
export type AuditoriaEntrada = {
    adminId: string;
    accion: string;
    entidad: 'usuario' | 'publicacion' | 'institucion' | 'categoria';
    entidadId: string | null;
    institucionId: string | null;
    detalle: Record<string, unknown> | null;
};
