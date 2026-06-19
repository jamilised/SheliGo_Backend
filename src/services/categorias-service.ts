import categoriasRepository from '../repositories/categorias-repository.js';
import AppError from '../errors/app-error.js';

class CategoriasService {
    private categoriasRepo = categoriasRepository;

    getAllCategorias = async () => {
        const categorias = await this.categoriasRepo.getAll();

        if (categorias === null) {
            throw new AppError('Error al recuperar las categorías', 500);
        }

        return categorias;
    };
}

export default new CategoriasService();