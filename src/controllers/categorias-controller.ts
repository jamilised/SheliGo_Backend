import type { Request, Response, NextFunction } from 'express';
import categoriasService from '../services/categorias-service.js';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categorias = await categoriasService.getAllCategorias();
        
        return res.status(200).json({
            status: 'success',
            data: { categorias }
        });
    } catch (error) {
        return next(error);
    }
};

export default {
    getAll
};