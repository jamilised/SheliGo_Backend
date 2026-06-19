import type { Request, Response, NextFunction } from 'express';
import institucionesService from '../services/instituciones-service.js';

const getRecientes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const instituciones = await institucionesService.getRecentInstituciones();
        
        return res.status(200).json({
            status: 'success',
            data: { instituciones }
        });
    } catch (error) {
        return next(error);
    }
};

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const instituciones = await institucionesService.getAllInstituciones();
        
        return res.status(200).json({
            status: 'success',
            data: { instituciones }
        });
    } catch (error) {
        return next(error);
    }
};

export default {
    getRecientes,
    getAll
};