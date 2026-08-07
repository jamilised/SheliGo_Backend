import { z } from 'zod';

export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z
    .string({ message: "La contraseña actual es obligatoria" })
    .min(1, "La contraseña actual es obligatoria"),
  
  nuevaContrasena: z
    .string({ message: "La nueva contraseña es obligatoria" })
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres")
    .max(100, "La nueva contraseña no puede superar los 100 caracteres")
});