import ArchivosRepository
from '../repositories/archivos-repository.js'

class ArchivosService {

    repository = new ArchivosRepository()

    getArchivos = async (
        publicacionId: string
    ) => {

        return await this.repository
            .getByPublicacionId(publicacionId)

    }

}

export default new ArchivosService()