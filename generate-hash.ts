import bcrypt from 'bcrypt'

const generar = async () => {

    const hash =
        await bcrypt.hash(
            '123456',
            10
        )

    console.log(hash)

}

generar()