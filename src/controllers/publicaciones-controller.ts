import type { Request, Response, NextFunction } from 'express';
import publicacionesService from '../services/publicaciones-service.js';
import preguntasService from '../services/preguntas-service.js';
import archivosService from '../services/archivos-service.js';

const getRecientes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('⚡ CONTROLLER PUB: Obteniendo recientes');

        const publicaciones =
            await publicacionesService.getRecentPublicaciones();

        return res.status(200).json({
            status: 'success',
            data: { publicaciones }
        });
    } catch (error) {
        return next(error);
    }
};

const search = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('⚡ CONTROLLER PUB: Iniciando búsqueda filtrada');

        // El middleware 'validateQuery' ya validó y limpió req.query
        const publicaciones =
            await publicacionesService.searchPublicaciones(
                req.query as any
            );

        return res.status(200).json({
            status: 'success',
            data: { publicaciones }
        });
    } catch (error) {
        return next(error);
    }
};

const getDetalle = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        const publicacion =
            await publicacionesService.getDetalle(id);

        return res.status(200).json({
            status: 'success',
            data: { publicacion }
        });
    } catch (error) {
        return next(error);
    }
};

const getArchivos = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        const archivos =
            await archivosService.getArchivos(id);

        return res.status(200).json({
            status: 'success',
            data: { archivos }
        });
    } catch (error) {
        return next(error);
    }
};

const getPreguntas = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        const preguntas =
            await preguntasService.getPreguntas(id);

        return res.status(200).json({
            status: 'success',
            data: { preguntas }
        });
    } catch (error) {
        return next(error);
    }
};

const createPregunta = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;
        const { contenido } = req.body;
        const usuarioId = res.locals.userIdLogged;

        const nuevaPregunta =
            await preguntasService.createPregunta(
                id,
                usuarioId,
                contenido
            );

        return res.status(201).json({
            status: 'success',
            message: 'Pregunta creada correctamente',
            data: {
                pregunta: nuevaPregunta
            }
        });
    } catch (error) {
        return next(error);
    }
};

const create = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const publicacion =
            await publicacionesService.createPublicacion(
                req.body,
                req.files,
                res.locals.userIdLogged
            );

        return res.status(201).json({
            status: "success",
            data: {
                publicacion
            }
        });
    } catch (error) {
        next(error);
    }
};

const remove = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        await publicacionesService.remove(
            id,
            res.locals.userIdLogged
        );

        return res.status(200).json({
            status: "success",
            message: "Publicación eliminada correctamente"
        });
    } catch (error) {
        next(error);
    }
};

const createRespuesta = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const preguntaId =
            req.params.preguntaId as string;

        const usuarioId =
            res.locals.userIdLogged;

        const { contenido } = req.body;

        const respuesta =
            await preguntasService.createRespuesta(
                preguntaId,
                usuarioId,
                contenido
            );

        return res.status(201).json({
            status: "success",
            message: "Respuesta creada correctamente",
            data: {
                respuesta
            }
        });
    } catch (error) {
        next(error);
    }
};

const update = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        console.log(
            "🚀 LLEGÓ PETICIÓN AL CONTROLLER DE UPDATE!"
        );

        console.log(
            "Params ID:",
            req.params.id
        );

        console.log(
            "Body recibido:",
            req.body
        );

        const id = req.params.id as string;

        const usuarioId =
            res.locals.userIdLogged;

        const publicacion =
            await publicacionesService.updatePublicacion(
                id,
                req.body,
                req.files,
                usuarioId
            );

        return res.status(200).json({
            status: "success",
            message: "Publicación actualizada correctamente",
            data: {
                publicacion
            }
        });
    } catch (error) {
        next(error);
    }
};

const getMisPublicaciones = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const publicaciones =
            await publicacionesService.getMisPublicaciones(
                res.locals.userIdLogged
            );

        return res.status(200).json({
            status: "success",
            data: {
                publicaciones
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getRecientes,
    getMisPublicaciones,
    search,
    getDetalle,
    getArchivos,
    getPreguntas,
    createPregunta,
    createRespuesta,
    create,
    remove,
    update
};