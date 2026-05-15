const DBConfig = {
    host        : 'localhost',
    database    : 'DAI',
    user        : 'postgres',
    password    : 'root',
    port        : 5432
    //max                     : 20,       //maximum number of clients the pool should contain by default this is set to 10.
    //idleTimeoutMillis       : 30000,
    //connectionTimeoutMillis : 2000
}
console.log('configuracion hardcodeada');

/*
const DBConfig = {
    host        : 'localhost',
    database    : 'DAI',
    user        : 'postgres',
    password    : 'root',
    port        : 5432
    //max                     : 20,       //maximum number of clients the pool should contain by default this is set to 10.
    //idleTimeoutMillis       : 30000,
    //connectionTimeoutMillis : 2000
}
console.log('configuracion hardcodeada');
*/
/*
const DBConfig = {
    host        : process.env.DB_HOST       ?? '',
    database    : process.env.DB_DATABASE   ?? '',
    user        : process.env.DB_USER       ?? '',
    password    : process.env.DB_PASSWORD   ?? '',
    port        : process.env.DB_PORT       ?? 5432
    //max                     : 20,       //maximum number of clients the pool should contain by default this is set to 10.
    //idleTimeoutMillis       : 30000,
    //connectionTimeoutMillis : 2000
}
*/
console.log('configuracion obtenida de .env', DBConfig);
export default DBConfig;