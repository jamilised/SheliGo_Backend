import DbPg from '../database/db-pg.js'

class AuthRepository {

    db = new DbPg()

    getByEmail = async (
        email: string
    ) => {

        const sql = `
            SELECT *
            FROM usuarios
            WHERE email = $1
        `

        return await this.db.queryOne(
            sql,
            [email]
        )

    }

}

export default AuthRepository