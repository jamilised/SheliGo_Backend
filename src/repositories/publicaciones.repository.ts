import { supabase } from '../database/supabase.js'

export default class PublicacionesRepository {

  async getById(id: string) {

    const { data, error } = await supabase
      .from('publicaciones')
      .select(`
        *,
        usuarios (
          id,
          nombre,
          apellido
        ),
        instituciones (
          id,
          nombre
        ),
        archivos (
          id,
          url,
          es_principal
        ),
        preguntas (
          id,
          contenido
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return data
  }
}