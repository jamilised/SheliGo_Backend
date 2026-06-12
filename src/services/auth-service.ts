import bcrypt from 'bcrypt'
import sharp from 'sharp'
import UsuariosRepository from '../repositories/usuarios-repository.js'
import AppError from '../errors/app-error.js'

class AuthService {
    private usuariosRepo = new UsuariosRepository()

    register = async (
        body: any,
        files: any
    ) => {
        const { nombre, apellido, email, telefono, password, confirmPassword } = body

        console.log('⚡ SERVICIO: Iniciando proceso de validaciones para el registro de:', email)

        // --- 1. VALIDACIÓN: CAMPOS OBLIGATORIOS ---
        if (!nombre || !apellido || !email || !password || !confirmPassword) {
            console.log('⚠️ Validación fallida: Faltan campos obligatorios')
            throw new AppError('Faltan completar campos obligatorios.', 400)
        }

        // --- 2. VALIDACIÓN: COINCIDENCIA DE CONTRASENIAS ---
        if (password !== confirmPassword) {
            console.log('⚠️ Validación fallida: Las contraseñas no coinciden')
            throw new AppError('Las contraseñas no coinciden.', 400)
        }

        // --- 3. VALIDACIÓN: FORMATO DE CORREO ELECTRÓNICO ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            console.log('⚠️ Validación fallida: Formato de email inválido:', email)
            throw new AppError('El formato del correo electrónico es inválido.', 400)
        }

        // --- 4. VALIDACIÓN: REGLAS DE FORTALEZA DE CONTRASEÑA ---
        // Explicación de la regla: Mínimo 8 caracteres, al menos 1 letra MAYÚSCULA y al menos 1 NÚMERO
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/
        if (!passwordRegex.test(password)) {
            console.log('⚠️ Validación fallida: La contraseña no cumple con los requisitos de seguridad')
            throw new AppError('La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula y un número.', 400)
        }

        // --- 5. VALIDACIÓN: USUARIO DUPLICADO EN DB ---
        const usuarioExistente = await this.usuariosRepo.getByEmail(email)
        if (usuarioExistente) {
            console.log('⚠️ Validación fallida: El email ya existe en la base de datos:', email)
            throw new AppError('El correo electrónico ya se encuentra registrado.', 409)
        }

        // --- 6. CIFRADO SEGURO DE CONTRASEÑA ---
        console.log('🔐 Cifrando contraseña con bcrypt...')
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        // --- 7. CREACIÓN INICIAL DEL REGISTRO EN DB ---
        const nuevoUsuario = await this.usuariosRepo.create({
            nombre,
            apellido,
            email,
            telefono: telefono || null,
            rol: 'user', 
            password_hash: passwordHash
        })

        if (!nuevoUsuario) {
            console.error('❌ Error de base de datos: El repositorio no retornó el usuario creado')
            throw new AppError('No se pudo completar el registro del usuario.', 500)
        }

        let fotoFinalPath = null

        // --- 8. PROCESAMIENTO, OPTIMIZACIÓN Y SUBIDA DE LA IMAGEN ---
        if (files && files.length > 0) {
            console.log('📸 Imagen detectada en el formulario. Iniciando Sharp...')
            
            const imagenOriginal = files[0]

            try {
                console.log('⚙️ Redimensionando y bajando calidad a la imagen...')
                const bufferOptimizado = await sharp(imagenOriginal.buffer)
                    .resize(400, 400, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toBuffer()

                const fileName = `${nuevoUsuario.id}.jpg`
                fotoFinalPath = `usuarios/${fileName}`

                console.log(`☁️ Subiendo imagen optimizada a Supabase Storage: ${fotoFinalPath}`)

                const storageUrl = `https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/public/avatars/${fotoFinalPath}`
                
                // Usamos Uint8Array para que el fetch nativo de TypeScript acepte el Buffer sin chillar
                const response = await fetch(storageUrl, {
                    method: 'POST',
                    body: new Uint8Array(bufferOptimizado),
                    headers: {
                        'Content-Type': 'image/jpeg'
                    }
                })

                if (!response.ok) {
                    console.error('❌ Error al subir el archivo en el Storage de Supabase:', response.statusText)
                } else {
                    console.log('✅ Imagen subida con éxito absoluto a Supabase Storage')
                    
                    await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath)
                    nuevoUsuario.foto = fotoFinalPath
                }

            } catch (errorSharp) {
                console.error('❌ Ocurrió un error al procesar la imagen con Sharp o subirla:', errorSharp)
            }
        }

        console.log('🎉 PROCESO DE SERVICIO REGISTRO FINALIZADO CON ÉXITO')
        return nuevoUsuario
    }
}

export default new AuthService()