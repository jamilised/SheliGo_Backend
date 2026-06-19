import ArchivosRepository from '../repositories/archivos-repository.js'

import { StorageHelper } from '../helpers/storage-helper.js'

class ArchivosService {

    repository = ArchivosRepository;

    getArchivos = async (
        publicacionId: string
    ) => {

        const archivos =
            await this.repository
                .getByPublicacionId(
                    publicacionId
                ) || []

        return archivos.map(
            (archivo: any) => ({

                ...archivo,

                url:
                    StorageHelper.buildUrl(
                        archivo.url
                    )

            })
        )

    }

}

export default new ArchivosService()