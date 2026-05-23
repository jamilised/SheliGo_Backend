import InstitucionesRepository from '../repositories/instituciones-repository.js';
import AppError from '../errors/app-error.js';

class InstitucionesService {
    private institucionesRepo = new InstitucionesRepository();

    getRecentInstituciones = async () => {
        const instituciones = await this.institucionesRepo.getRecent();

        if (instituciones === null) {
            throw new AppError('Error al recuperar las instituciones recientes', 500);
        }

        return instituciones;
    };
}

export default new InstitucionesService;