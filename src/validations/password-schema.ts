import { z } from 'zod';

export const passwordSchema = z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede superar los 100 caracteres')
    .regex(
        /^(?=.*[A-Z])(?=.*\d).{8,}$/,
        'La contraseña debe incluir al menos una letra mayúscula y un número'
    );
