export interface PublicacionDetalleDTO {
  id: string
  nombre: string
  descripcion: string | null
  fecha_evento: string
  latitud: number | null
  longitud: number | null
  estado: string
  tipo: string

  usuario: {
    id: string
    nombre: string
    apellido: string
  }

  institucion: {
    id: string
    nombre: string
  } | null

  archivos: {
    id: string
    url: string
    es_principal: boolean
  }[]

  preguntas: {
    id: string
    contenido: string
    usuario: string
  }[]
}