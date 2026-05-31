import PublicacionesRepository from '../repositories/publicaciones-repository.js'
import NotFoundError from '../errors/not-found-error.js'
import AppError from '../errors/app-error.js';

class PublicacionesService {

    repository = new PublicacionesRepository()

    getDetalle = async (id: string) => {

        const publicacion =
            await this.repository.getById(id)

        if (!publicacion) {
            throw new NotFoundError(
                'Publicación no encontrada'
            )
        }

        return publicacion

    }

    getRecentPublicaciones = async () => {
        const publicaciones = await this.repository.getRecent();

        if (publicaciones === null) {
            throw new AppError('Error al recuperar las publicaciones recientes', 500);
        }

        // URL base de tu bucket público en Supabase (reemplazá con tu host real de Supabase)
        const SUPABASE_STORAGE_URL = 'https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/public/avatars/'

        // 2. Mapeamos el array para transformar la URL de cada publicación
        const publicacionesConUrlCompleta = publicaciones.map((pub: any) => {
            // Si la publicación tiene una foto asociada, le pegamos la URL base adelante
            if (pub.foto_principal_url) {
                pub.foto_principal_url = `${SUPABASE_STORAGE_URL}${pub.foto_principal_url}`
            } else {
                // Opcional: Si no tiene foto, le podés clavar una foto por defecto para que el Front no quede vacío
                pub.foto_principal_url = 'https://www.publicdomainpictures.net/pictures/200000/velka/placeholder-bege.jpg'
            }
            return pub
        })
        
        return publicacionesConUrlCompleta;
    };

}

export default new PublicacionesService()