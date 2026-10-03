const sslDisabled =
    process.env.DB_SSL === 'false' || process.env.DB_SSL === '0'

const DBConfig = {
    host     : process.env.DB_HOST ?? '',
    database : process.env.DB_DATABASE ?? '',
    user     : process.env.DB_USER ?? '',
    password : process.env.DB_PASSWORD ?? '',
    port     : Number(process.env.DB_PORT) || 5432,

    ssl: sslDisabled
        ? false
        : { rejectUnauthorized: true }
}

export default DBConfig;
