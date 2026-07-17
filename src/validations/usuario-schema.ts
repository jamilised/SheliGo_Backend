import { z } from "zod";

const capitalizar = (texto: string) => {
    const limpio = texto.trim().replace(/\s+/g, " ");

    return limpio
        .split(" ")
        .map(
            palabra =>
                palabra.charAt(0).toUpperCase() +
                palabra.slice(1).toLowerCase()
        )
        .join(" ");
};

export const updatePerfilSchema = z.object({

    nombre: z.string()
        .trim()
        .min(2)
        .max(50)
        .transform(capitalizar)
        .optional(),

    apellido: z.string()
        .trim()
        .min(2)
        .max(50)
        .transform(capitalizar)
        .optional(),

    eliminarFoto: z.coerce.boolean().optional()

});