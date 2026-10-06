import { z } from 'zod';

const uuidSchema = z.string().uuid('El ID debe ser un UUID válido');

export const chatSalaParamsSchema = z.object({
    id: uuidSchema
});

export const chatMensajeParamsSchema = z.object({
    id: uuidSchema
});

export const abrirChatSchema = z.object({
    otroUsuarioId: uuidSchema
});

export const enviarMensajeSchema = z.object({
    sala_id: uuidSchema,
    contenido: z.string()
        .trim()
        .min(1, 'El contenido no puede estar vacío')
        .max(2000, 'El contenido no puede superar 2000 caracteres')
        .optional()
});

export const chatSalasQuerySchema = z.object({
    filtro: z.enum(['leidas', 'no_leidas']).optional(),
    busqueda: z.string()
        .trim()
        .min(1, 'La búsqueda no puede estar vacía')
        .max(100, 'La búsqueda no puede superar 100 caracteres')
        .optional()
});
