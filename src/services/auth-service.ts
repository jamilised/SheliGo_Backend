import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UsuariosRepository from '../repositories/usuarios-repository.js';
import { StorageHelper } from '../helpers/storage-helper.js'; // 🚀 Usamos el helper genérico estático
import AppError from '../errors/app-error.js';

class AuthService {
    private usuariosRepo = UsuariosRepository;

    login = async (email: string, password: string) => {
        console.log('⚡ SERVICIO AUTH: Iniciando login para:', email);

        const usuario = await this.usuariosRepo.getByEmail(email);
        if (!usuario) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
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

        // --- 4. PROCESAMIENTO Y SUBIDA DE IMAGEN REUTILIZABLE ---
        let fotoFinalPath = 'usuarios/default.png';

        if (files && files.length > 0) {
            const archivoImagen = files[0];
            const fileName = `${nuevoUsuario.id}.jpg`;

            // Invocamos al helper pasándole su configuración específica (cuadrado 400x400) 🎯
            const pathSubido = await StorageHelper.optimizarYSubir(
                archivoImagen.buffer,
                'usuarios',
                fileName,
                { width: 400, height: 400, fit: 'cover' }
            );

            if (pathSubido) {
                fotoFinalPath = pathSubido;
                // Sincronizamos la nueva ruta en la base de datos
                await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath);
            }
        } else {
            console.log('ℹ️ No se detectó foto. Asignando default.');
            await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath);
        }

        nuevoUsuario.foto = fotoFinalPath;
        console.log('🎉 PROCESO DE REGISTRO FINALIZADO CON ÉXITO');
        return nuevoUsuario;
    };
}

export default new AuthService();