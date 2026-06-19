import bcrypt from 'bcrypt'
import sharp from 'sharp'
import UsuariosRepository from '../repositories/usuarios-repository.js'
import AppError from '../errors/app-error.js'
import { capitalize } from '../helpers/string-helper.js'

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

        // --- 2. VALIDACIÓN: LONGITUD DE NOMBRE Y APELLIDO (Anti-abusos) ---
        if (nombre.trim().length < 2 || nombre.length > 50) {
            console.log('⚠️ Validación fallida: Longitud de nombre inválida:', nombre)
            throw new AppError('El nombre debe tener entre 2 y 50 caracteres.', 400)
        }
        if (apellido.trim().length < 2 || apellido.length > 50) {
            console.log('⚠️ Validación fallida: Longitud de apellido inválida:', apellido)
            throw new AppError('El apellido debe tener entre 2 y 50 caracteres.', 400)
        }

        // --- 3. VALIDACIÓN: COINCIDENCIA DE CONTRASENIAS ---
        console.log("Lo que llega al servicio:", { password, confirmPassword })
        if (password !== confirmPassword) {
            console.log('⚠️ Validación fallida: Las contraseñas no coinciden')
            throw new AppError('Las contraseñas no coinciden.', 400)
        }

        // --- 4. VALIDACIÓN: FORMATO DE CORREO ELECTRÓNICO ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            console.log('⚠️ Validación fallida: Formato de email inválido:', email)
            throw new AppError('El formato del correo electrónico es inválido.', 400)
        }

        // --- 5. VALIDACIÓN: FORMATO Y LONGITUD DEL TELÉFONO ---
        if (telefono) {
            const telefonoLimpio = telefono.toString().trim()
            const telefonoRegex = /^[0-9]+$/ // Solo números nativos
            if (telefonoLimpio.length < 7 || telefonoLimpio.length > 15 || !telefonoRegex.test(telefonoLimpio)) {
                console.log('⚠️ Validación fallida: Teléfono inválido o de longitud incorrecta:', telefono)
                throw new AppError('El teléfono debe contener solo números y tener entre 7 y 15 dígitos.', 400)
            }
        }

        // --- 6. VALIDACIÓN: REGLAS DE FORTALEZA DE CONTRASEÑA ---
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/
        if (!passwordRegex.test(password)) {
            console.log('⚠️ Validación fallida: La contraseña no cumple con los requisitos de seguridad')
            throw new AppError('La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula y un número.', 400)
        }

        // --- 7. VALIDACIÓN: USUARIO DUPLICADO EN DB ---
        const usuarioExistente = await this.usuariosRepo.getByEmail(email)
        if (usuarioExistente) {
            console.log('⚠️ Validación fallida: El email ya existe en la base de datos:', email)
            throw new AppError('El correo electrónico ya se encuentra registrado.', 409)
        }

        // --- 8. CIFRADO SEGURO DE CONTRASEÑA ---
        console.log('🔐 Cifrando contraseña con bcrypt...')
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        const nombreNormalizado = capitalize(nombre.trim())
        const apellidoNormalizado = capitalize(apellido.trim())

        // --- 9. CREACIÓN INICIAL DEL REGISTRO EN DB ---
        // (Dejamos seteado 'usuarios/default.png' por si el usuario decide no subir foto)
        const nuevoUsuario = await this.usuariosRepo.create({
            nombre: nombreNormalizado.trim(),
            apellido: apellidoNormalizado.trim(),
            email: email.toLowerCase().trim(),
            telefono: telefono ? telefono.toString().trim() : null,
            rol: 'user',
            password_hash: passwordHash
        })

        if (!nuevoUsuario) {
            console.error('❌ Error de base de datos: El repositorio no retornó el usuario creado')
            throw new AppError('No se pudo completar el registro del usuario.', 500)
        }

        // Por defecto le asignamos la ruta de la imagen estática que ya vive en tu storage de Supabase
        nuevoUsuario.foto = 'usuarios/default.png'

        // --- 10. PROCESAMIENTO, OPTIMIZACIÓN Y SUBIDA DE LA IMAGEN ---
        if (files && files.length > 0) {
            console.log('📸 Imagen detectada en el formulario. Iniciando Sharp...')
            const imagenOriginal = files[0]

            try {
                console.log('⚙️ Redimensionando y bajando calidad a la imagen con Sharp...')
                const bufferOptimizado = await sharp(imagenOriginal.buffer)
                    .resize(400, 400, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toBuffer()

                // Armamos el nombre definitivo utilizando el UUID recién generado por Supabase
                const fileName = `${nuevoUsuario.id}.jpg`
                const fotoFinalPath = `usuarios/${fileName}`

                console.log(`☁️ Subiendo imagen optimizada a Supabase Storage: ${fotoFinalPath}`)
                const storageUrl = `https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/avatars/${fotoFinalPath}`

                // Buscamos la clave de Supabase en tus variables de entorno. 
                // Cambiá 'SUPABASE_KEY' por el nombre exacto que tengan en su archivo .env (ej: SUPABASE_ANON_KEY o SUPABASE_KEY)
                const supabaseToken = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

                const response = await fetch(storageUrl, {
                    method: 'PUT',
                    body: new Uint8Array(bufferOptimizado),
                    headers: {
                        'Content-Type': 'image/jpeg',
                        'x-upsert': 'true',
                        'Authorization': `Bearer ${supabaseToken}`, // <-- ¡MANDATORIO! Esto soluciona tu error 400
                        'apikey': supabaseToken // <-- Supabase a veces pide que dupliquemos el token en este header
                    }
                })

                // Vamos a espiar qué nos responde exactamente Supabase si vuelve a fallar
                if (!response.ok) {
                    const errorTexto = await response.text();
                    console.error('❌ Error crítico al subir el archivo en el Storage de Supabase:', response.status, response.statusText)
                    console.error('📋 Detalle de Supabase:', errorTexto)
                    console.error('⚠️ Se conservará "usuarios/default.png" para este perfil.')
                } else {
                    console.log('✅ Imagen subida con éxito absoluto a Supabase Storage')

                    // Como la subida HTTP fue un éxito, actualizamos la base de datos reemplazando el default por su ID.jpg
                    await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath)
                    nuevoUsuario.foto = fotoFinalPath
                }

            } catch (errorSharp) {
                console.error('❌ Ocurrió un error inesperado al procesar con Sharp o subirla:', errorSharp)
            }
        } else {
            console.log('ℹ️ No se detectó ninguna foto en el formulario. Se asigna por defecto: usuarios/default.png')
            // Aprovechamos y actualizamos la DB para que no quede null en la columna de la tabla
            await this.usuariosRepo.updateFoto(nuevoUsuario.id, 'usuarios/default.png')
        }

        console.log('🎉 PROCESO DE SERVICIO REGISTRO FINALIZADO CON ÉXITO')
        return nuevoUsuario
    }
}

export default new AuthService()