export type EstadoPublicacion =
  | 'activa'
  | 'pausada'
  | 'en_revision'
  | 'match_detectado'
  | 'reclamada'
  | 'recuperada'
  | 'cerrada'

export type TipoPublicacion =
  | 'perdido'
  | 'encontrado'