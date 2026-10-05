import { z } from 'zod';

const formatearNombre = (val: string) => {
    const limpio = val.trim();
    if (!limpio) return '';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
};

export const loginSchema = z.object({
    email: z.string()
        .min(1, 'El correo electrónico es obligatorio')
        .email('El formato del correo electrónico es inválido')
        .trim()
        .toLowerCase(),
    password: z.string()
        .min(1, 'La contraseña es obligatoria')
});

export const completeInstitutionsSchema = z.object({
    instituciones_ids: z.preprocess(
        (value) => {
            if (typeof value !== 'string') {
                return value;
            }

            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        },
        z.array(
            z.string().uuid('UUID de institución inválido'),
            { message: 'Debes enviar un arreglo de IDs de instituciones' }
        )
            .min(1, 'Debes seleccionar al menos una institución')
            .max(50, 'No puedes seleccionar más de 50 instituciones')
    )
});

export const registerSchema = z.object({
    nombre: z.string()
        .min(2, 'El nombre debe tener entre 2 y 50 caracteres')
        .max(50, 'El nombre debe tener entre 2 y 50 caracteres')
        .transform(formatearNombre),
        
    apellido: z.string()
        .min(2, 'El apellido debe tener entre 2 y 50 caracteres')
        .max(50, 'El apellido debe tener entre 2 y 50 caracteres')
        .transform(formatearNombre),
        
    email: z.string()
        .min(1, 'El correo electrónico es obligatorio')
        .email('El formato del correo electrónico es inválido')
        .trim()
        .toLowerCase(),
        
    telefono: z.string()
        .regex(/^[0-9]+$/, 'El teléfono debe contener solo números')
        .min(7, 'El teléfono debe tener entre 7 y 15 dígitos')
        .max(15, 'El teléfono debe tener entre 7 y 15 dígitos')
        .optional()
        .or(z.literal(''))
        .transform(val => val === '' ? undefined : val),
        
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/^(?=.*[A-Z])(?=.*\d).{8,}$/, 'La contraseña debe incluir al menos una letra mayúscula y un número'),
        
    confirmPassword: z.string()
        .min(1, 'Debe confirmar su contraseña'),

    instituciones_ids: z.preprocess(
        (val) => {
            if (!val) return undefined;
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) ? parsed : [val];
                } catch {
                    return [val];
                }
            }
            return val;
        },
        z.array(z.string().uuid('UUID de institución inválido'), {
            message: 'Debes seleccionar al menos una institución para registrarte'
        }).min(1, 'Debes seleccionar al menos una institución para registrarte')
    )
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
});