export const BCRYPT_SALT_ROUNDS = 12;

export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('Falta configurar JWT_SECRET.');
    }

    return secret;
};
