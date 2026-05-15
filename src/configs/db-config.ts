const DBConfig = {
    host     : process.env.DB_HOST ?? '',
    database : process.env.DB_DATABASE ?? '',
    user     : process.env.DB_USER ?? '',
    password : process.env.DB_PASSWORD ?? '',
    port: Number(process.env.DB_PORT) || 5432,
    ssl      : {
        rejectUnauthorized: false
    }
}

console.log('configuracion obtenida de .env', DBConfig);

export default DBConfig;