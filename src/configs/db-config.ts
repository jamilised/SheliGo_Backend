const positiveIntegerFromEnv = (name: string, defaultValue: number): number => {
    const value = process.env[name];
    if (value === undefined || value.trim() === '') {
        return defaultValue;
    }

    const parsedValue = Number(value);
    if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
        throw new Error(`${name} debe ser un entero positivo.`);
    }

    return parsedValue;
};

const DBConfig = {
    host     : process.env.DB_HOST ?? '',
    database : process.env.DB_DATABASE ?? '',
    user     : process.env.DB_USER ?? '',
    password : process.env.DB_PASSWORD ?? '',
    port     : Number(process.env.DB_PORT) || 5432,

    ssl: {
        rejectUnauthorized: false
    },
    max: positiveIntegerFromEnv('DB_POOL_MAX', 10),
    idleTimeoutMillis: positiveIntegerFromEnv('DB_POOL_IDLE_TIMEOUT_MS', 30000),
    connectionTimeoutMillis: positiveIntegerFromEnv('DB_POOL_CONNECTION_TIMEOUT_MS', 2000)
}

export default DBConfig;