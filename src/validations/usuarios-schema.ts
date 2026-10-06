import { z } from "zod";
import { passwordSchema } from './password-schema.js';

export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z
    .string({ message: "La contraseña actual es obligatoria" })
    .min(1, "La contraseña actual es obligatoria"),
  
  nuevaContrasena: passwordSchema,
});

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

/*
instituciones_ids puede llegar como array (JSON) o como string dentro de un
FormData (JSON.stringify([...]) o un único id). Se normaliza a array de UUID.
*/
const institucionesIdsSchema = z.preprocess(
    (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value !== "string") return value;

        const trimmed = value.trim();
        if (trimmed === "") return [];

        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [trimmed];
        }
    },
    z.array(
        z.string().uuid("UUID de institución inválido"),
        { message: "Las instituciones enviadas no son válidas" }
    )
        .min(1, "Debes pertenecer al menos a una institución")
        .max(50, "No puedes seleccionar más de 50 instituciones")
);

export const updatePerfilSchema = z.object({

    nombre: z.string()
        .trim()
        .min(2, "El nombre debe tener entre 2 y 50 caracteres")
        .max(50, "El nombre debe tener entre 2 y 50 caracteres")
        .transform(capitalizar)
        .optional(),

    apellido: z.string()
        .trim()
        .min(2, "El apellido debe tener entre 2 y 50 caracteres")
        .max(50, "El apellido debe tener entre 2 y 50 caracteres")
        .transform(capitalizar)
        .optional(),

    eliminarFoto: z.preprocess(
        (value) => value === true || value === "true" || value === "1",
        z.boolean()
    ).optional(),

    instituciones_ids: institucionesIdsSchema.optional()

});
