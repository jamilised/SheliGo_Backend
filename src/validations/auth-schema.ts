import { z } from 'zod';

// Función helper para limpiar espacios y capitalizar (ej: " mAiCa  " -> "Maica")
const formatearNombre = (val: string) => {
    const limpio = val.trim();
    if (!limpio) return '';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
};

// 1. Esquema para el Login
export const loginSchema = z.object({
    email: z.string()
        .min(1, 'El correo electrónico es obligatorio')
        .email('El formato del correo electrónico es inválido')
        .trim()           //  Opcional pero recomendado: limpia espacios en el login
        .toLowerCase(),   //  Clava en minúsculas para que matchee perfecto
    password: z.string()
        .min(1, 'La contraseña es obligatoria')
});

// 2. Esquema para el Registro
export const registerSchema = z.object({
    nombre: z.string()
        .min(2, 'El nombre debe tener entre 2 y 50 caracteres')
        .max(50, 'El nombre debe tener entre 2 y 50 caracteres')
        .transform(formatearNombre), // Limpia espacios y clava Capitalize
        
    apellido: z.string()
        .min(2, 'El apellido debe tener entre 2 y 50 caracteres')
        .max(50, 'El apellido debe tener entre 2 y 50 caracteres')
        .transform(formatearNombre), // Limpia espacios y clava Capitalize
        
    email: z.string()
        .min(1, 'El correo electrónico es obligatorio')
        .email('El formato del correo electrónico es inválido')
        .trim()                       // Quita espacios locos
        .toLowerCase(),               // Clava todo en minúsculas
        
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
        .min(1, 'Debe confirmar su contraseña')
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
});