import categoriasRepository from '../repositories/categorias-repository.js';
import AppError from '../errors/app-error.js';

class CategoriasService {
    private categoriasRepo = categoriasRepository;

    getAllCategorias = async () => {
        const categorias = await this.categoriasRepo.getAll();

        // 🔍 Log temporal para espiar qué nos trae la base de datos
        console.log('🔍 ¿Qué devolvió el repositorio de categorías?:', categorias);

        // Si es null o undefined lanzamos el error, pero permitimos arrays vacíos []
        if (categorias === null || categorias === undefined) {
            throw new AppError('Error al recuperar las categorías de la base de datos', 500);
        }

        return categorias;
    };
}

export default new CategoriasService();