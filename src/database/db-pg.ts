import { Pool } from 'pg'
import config from '../configs/db-config.js'

export default class DbPg {

    DBPool: Pool | null

    constructor() {
        this.DBPool = null
    }

    getDBPool = (): Pool => {
        if (this.DBPool == null) {
            this.DBPool = new Pool(config)
        }
        return this.DBPool
    }

    queryAll = async (sql: string, values: any[] | null = null) => {
        const resultPg = values
            ? await this.getDBPool().query(sql, values)
            : await this.getDBPool().query(sql)

        return resultPg.rows
    }

    queryOne = async (sql: string, values: any[] | null = null) => {
        const resultPg = values
            ? await this.getDBPool().query(sql, values)
            : await this.getDBPool().query(sql)

        return resultPg.rows[0] ?? null
    }
}