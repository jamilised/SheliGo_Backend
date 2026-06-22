import InstitucionesRepository from '../repositories/instituciones-repository.js';
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';

class InstitucionesService {
    private institucionesRepo = InstitucionesRepository;

    getRecentInstituciones = async () => {
        const instituciones = await this.institucionesRepo.getRecent();

        if (instituciones === null) {
            throw new AppError('Error al recuperar las instituciones recientes', 500);
        }

        const institucionesConUrlCompleta = instituciones.map((inst: any) => {
        // Transformamos 'instituciones/nombre.ext' en la URL completa
        inst.foto = StorageHelper.buildUrl(inst.foto); // o el nombre que tenga tu columna de foto
        return inst;
    });

        return institucionesConUrlCompleta;
    };

    getAllInstituciones = async () => {
    const instituciones = await this.institucionesRepo.getAll();

    if (instituciones === null) {
        throw new AppError('Error al recuperar las instituciones', 500);
    }

    // Mapeamos las fotos con la URL completa
    return instituciones.map((inst: any) => {
        inst.foto = StorageHelper.buildUrl(inst.foto);
        return inst;
    });
};
}

export default new InstitucionesService;