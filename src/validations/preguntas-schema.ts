import { z } from 'zod';

const contenidoSchema = z.string()
    .trim()
    .min(1, 'El contenido no puede estar vacío')
    .max(2000, 'El contenido no puede superar 2000 caracteres');

export const publicacionPreguntaParamsSchema = z.object({
    id: z.string().uuid('ID de publicación inválido')
});

export const preguntaParamsSchema = z.object({
    preguntaId: z.string().uuid('ID de pregunta inválido')
});

export const createPreguntaSchema = z.object({
    contenido: contenidoSchema
});

export const createRespuestaSchema = z.object({
    contenido: contenidoSchema
});
