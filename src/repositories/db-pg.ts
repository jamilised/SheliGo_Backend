import pkg from 'pg'
import config from '../configs/db-config.js'
import LogHelper from '../helpers/log-helper.js'

const { Pool } = pkg

export default class DbPg {

    DBPool: pkg.Pool | null

    constructor() {
        this.DBPool = null
    }

    getDBPool = (): pkg.Pool => {

        if (this.DBPool == null) {
            this.DBPool = new Pool(config)
        }

        return this.DBPool
    }

    queryAll = async (sql: string, values: any[] | null = null) => {

        let returnArray = null

        try {

            const resultPg = values
                ? await this.getDBPool().query(sql, values)
                : await this.getDBPool().query(sql)

            returnArray = resultPg.rows

        } catch (error) {
            LogHelper.logError(error)
        }

        return returnArray
    }

    queryOne = async (sql: string, values: any[] | null = null) => {

        let returnEntity = null

        try {

            const resultPg = values
                ? await this.getDBPool().query(sql, values)
                : await this.getDBPool().query(sql)

            if (resultPg.rows.length > 0) {
                returnEntity = resultPg.rows[0]
            }

        } catch (error) {
            LogHelper.logError(error)
        }

        return returnEntity
    }
}