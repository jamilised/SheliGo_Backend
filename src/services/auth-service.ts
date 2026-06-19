import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import UsuariosRepository from '../repositories/usuarios-repository.js';
import AppError from '../errors/app-error.js';

class AuthService {
    private usuariosRepo = new UsuariosRepository();

    login = async (email: string, password_plain: string) => {
        console.log('⚡ SERVICIO AUTH: Iniciando login para:', email);

        const usuario = await this.usuariosRepo.getByEmail(email);
        if (!usuario) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const passwordValida = await bcrypt.compare(password_plain, usuario.password_hash);
        if (!passwordValida) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const token = jwt.sign(
            { userId: usuario.id },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        return {
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                foto: usuario.foto
            }
        };
    };

    register = async (body: any, files: any) => {
        const { nombre, apellido, email, telefono, password } = body;

        console.log('⚡ SERVICIO AUTH: Iniciando proceso de registro para:', email);

        // --- 1. VALIDACIÓN DE BASE DE DATOS ---
        const usuarioExistente = await this.usuariosRepo.getByEmail(email);
        if (usuarioExistente) {
            console.log('⚠️ Validación fallida: El email ya existe:', email);
            throw new AppError('El correo electrónico ya se encuentra registrado.', 409);
        }

        // --- 2. CIFRADO DE CONTRASEÑA ---
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // --- 3. CREACIÓN DEL REGISTRO ---
        const nuevoUsuario = await this.usuariosRepo.create({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.toLowerCase().trim(),
            telefono: telefono ? telefono.toString().trim() : null,
            rol: 'user',
            password_hash: passwordHash
        });

        if (!nuevoUsuario) {
            throw new AppError('No se pudo completar el registro del usuario.', 500);
        }

        // --- 4. PROCESAMIENTO Y SUBIDA DE IMAGEN (Delegado a método privado) ---
        let fotoFinalPath = 'usuarios/default.png';

        if (files && files.length > 0) {
            const pathSubido = await this.optimizarYSubirAvatar(nuevoUsuario.id, files[0]);
            if (pathSubido) {
                fotoFinalPath = pathSubido;
            }
        } else {
            console.log('ℹ️ No se detectó foto. Asignando default.');
            await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath);
        }

        nuevoUsuario.foto = fotoFinalPath;
        console.log('🎉 PROCESO DE REGISTRO FINALIZADO CON ÉXITO');
        return nuevoUsuario;
    };

    // --- 🛠️ HELPER INTERNO: Aislamos la complejidad de Supabase/Sharp ---
    private optimizarYSubirAvatar = async (usuarioId: string, archivoImagen: any): Promise<string | null> => {
        try {
            console.log('⚙️ Optimizando imagen con Sharp...');
            const bufferOptimizado = await sharp(archivoImagen.buffer)
                .resize(400, 400, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();

            const fileName = `${usuarioId}.jpg`;
            const fotoFinalPath = `usuarios/${fileName}`;
            const storageUrl = `https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/avatars/${fotoFinalPath}`;
            const supabaseToken = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

            console.log(`☁️ Subiendo avatar a Supabase: ${fotoFinalPath}`);
            const response = await fetch(storageUrl, {
                method: 'PUT',
                body: new Uint8Array(bufferOptimizado),
                headers: {
                    'Content-Type': 'image/jpeg',
                    'x-upsert': 'true',
                    'Authorization': `Bearer ${supabaseToken}`,
                    'apikey': supabaseToken
                }
            });

            if (!response.ok) {
                const errorTexto = await response.text();
                console.error('❌ Error de Supabase Storage:', response.status, errorTexto);
                return null;
            }

            console.log('✅ Imagen subida con éxito absoluto a Supabase Storage');
            await this.usuariosRepo.updateFoto(usuarioId, fotoFinalPath);
            return fotoFinalPath;

        } catch (error) {
            console.error('❌ Error inesperado procesando o subiendo avatar:', error);
            return null;
        }
    };
}

export default new AuthService();