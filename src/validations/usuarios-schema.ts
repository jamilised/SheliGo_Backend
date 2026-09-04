import { z } from "zod";

export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z
    .string({ message: "La contraseña actual es obligatoria" })
    .min(1, "La contraseña actual es obligatoria"),
  
  nuevaContrasena: z
    .string({ message: "La nueva contraseña es obligatoria" })
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres")
    .max(100, "La nueva contraseña no puede superar los 100 caracteres")
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

    eliminarFoto: z.coerce.boolean().optional(),

    instituciones_ids: z.union([
        z.array(z.string().uuid('UUID de institución inválido')),
        z.string().transform((val) => {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed;
                return [val];
            } catch {
                return [val];
            }
        })
    ]).optional()

});