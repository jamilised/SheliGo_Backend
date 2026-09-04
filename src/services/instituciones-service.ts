import InstitucionesRepository from '../repositories/instituciones-repository.js';
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';

class InstitucionesService {
    private institucionesRepo = InstitucionesRepository;

    getInstitucionesParaSelector = async () => {
        const instituciones = await this.institucionesRepo.getParaSelector();

        if (instituciones === null) {
            throw new AppError('Error al recuperar el listado de instituciones', 500);
        }

        return instituciones;
    };

    getRecentInstituciones = async () => {
        const instituciones = await this.institucionesRepo.getRecent();

        if (instituciones === null) {
            throw new AppError('Error al recuperar las instituciones recientes', 500);
        }

        const institucionesConUrlCompleta = instituciones.map((inst: any) => {
            inst.foto = StorageHelper.buildUrl(inst.foto);
            return inst;
        });

        return institucionesConUrlCompleta;
    };

    getAllInstituciones = async () => {
        const instituciones = await this.institucionesRepo.getAll();

        if (instituciones === null) {
            throw new AppError('Error al recuperar las instituciones', 500);
        }

        return instituciones.map((inst: any) => {
            inst.foto = StorageHelper.buildUrl(inst.foto);
            return inst;
        });
    };
}

export default new InstitucionesService();