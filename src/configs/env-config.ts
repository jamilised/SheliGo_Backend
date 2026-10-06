const requiredEnvironmentVariables = [
    'DB_HOST',
    'DB_DATABASE',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_BUCKET'
] as const;

export const validateEnvironment = (): void => {
    const missingVariables = requiredEnvironmentVariables.filter(
        (name) => !process.env[name]?.trim()
    );
    const jwtSecret = process.env.JWT_SECRET;

    if (missingVariables.length > 0) {
        throw new Error(
            `Faltan variables de entorno requeridas: ${missingVariables.join(', ')}`
        );
    }

    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET debe contener al menos 32 caracteres.');
    }

    try {
        const storageUrl = new URL(process.env.SUPABASE_URL ?? '');
        if (!['http:', 'https:'].includes(storageUrl.protocol)) {
            throw new Error();
        }
    } catch {
        throw new Error('SUPABASE_URL debe ser una URL HTTP o HTTPS válida.');
    }
};
