import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UsuariosRepository from '../repositories/usuarios-repository.js';
import { StorageHelper } from '../helpers/storage-helper.js'; // 🚀 Usamos el helper genérico estático
import AppError from '../errors/app-error.js';

class AuthService {
    private usuariosRepo = UsuariosRepository;

    login = async (email: string, password: string) => {
        console.log('⚡ SERVICIO AUTH: Iniciando login para:', email);

        const usuario = await this.usuariosRepo.getByEmail(
            email.toLowerCase().trim()
        );
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
            { expiresIn: '1d' }
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

    // auth-service.ts

    register = async (body: any, files: any) => {
        const { nombre, apellido, email, telefono, password, instituciones_ids } = body;

        console.log('⚡ SERVICIO AUTH: Iniciando proceso de registro para:', email);

        // --- 1. VALIDACIÓN DE BASE DE DATOS ---
        const usuarioExistente = await this.usuariosRepo.getByEmail(email);
        if (usuarioExistente) {
            console.log('⚠️ Validación fallida: El email ya existe:', email);
            throw new AppError('El correo electrónico ya se encuentra registrado.', 409);
        }

        // --- 2. CIFRADO DE CONTRASEÑA ---
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // --- 3. CREACIÓN DEL REGISTRO DE USUARIO ---
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

        // --- 4. ASOCIACIÓN DE INSTITUCIONES ---
        let arrayInstituciones: string[] = [];

        if (instituciones_ids) {
            if (Array.isArray(instituciones_ids)) {
                arrayInstituciones = instituciones_ids;
            } else if (typeof instituciones_ids === 'string') {
                try {
                    // Si viene como string JSON desde FormData ej: '["uuid1", "uuid2"]'
                    arrayInstituciones = JSON.parse(instituciones_ids);
                } catch {
                    // Si viene como una sola string limpia ej: 'uuid1'
                    arrayInstituciones = [instituciones_ids];
                }
            }

            if (arrayInstituciones.length > 0) {
                await this.usuariosRepo.asociarInstituciones(nuevoUsuario.id, arrayInstituciones);
            }
        }

        // --- 5. PROCESAMIENTO Y SUBIDA DE IMAGEN REUTILIZABLE ---
        let fotoFinalPath = 'usuarios/default.png';

        if (files && files.length > 0) {
            const archivoImagen = files[0];
            const fileName = `${nuevoUsuario.id}.jpg`;

            const pathSubido = await StorageHelper.optimizarYSubir(
                archivoImagen.buffer,
                'usuarios',
                fileName,
                { width: 400, height: 400, fit: 'cover' }
            );

            if (pathSubido) {
                fotoFinalPath = pathSubido;
                await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath);
            }
        } else {
            console.log('ℹ️ No se detectó foto. Asignando default.');
            await this.usuariosRepo.updateFoto(nuevoUsuario.id, fotoFinalPath);
        }

        nuevoUsuario.foto = fotoFinalPath;

        // Obtenemos el detalle completo de las instituciones asociadas para devolver al cliente
        const institucionesAsociadas = await this.usuariosRepo.getInstitucionesByUsuarioId(nuevoUsuario.id);

        console.log('🎉 PROCESO DE REGISTRO FINALIZADO CON ÉXITO');

        return {
            ...nuevoUsuario,
            instituciones: institucionesAsociadas || []
        };
    };

    loginConGoogle = async (tokenSupabase: string) => {
        const { supabase } = await import('../database/supabase.js');

        const { data: { user }, error } = await supabase.auth.getUser(tokenSupabase);
        if (error || !user) {
            throw new AppError('Token de Google/Supabase inválido o expirado.', 401);
        }

        let usuarioLocal = await this.usuariosRepo.getById(user.id);
        let esNuevoUsuario = false;

        if (!usuarioLocal && user.email) {
            usuarioLocal = await this.usuariosRepo.getByEmail(user.email);
        }

        if (!usuarioLocal) {
            esNuevoUsuario = true;
            const fullName = (user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario Google').trim();
            let primerNombre = fullName;
            let elApellido = ' ';

            const espacioIndex = fullName.indexOf(' ');
            if (espacioIndex > 0) {
                primerNombre = fullName.substring(0, espacioIndex);
                elApellido = fullName.substring(espacioIndex + 1);
            }

            usuarioLocal = await this.usuariosRepo.create({
                id: user.id,
                nombre: primerNombre,
                apellido: elApellido,
                email: user.email!,
                telefono: null,
                rol: 'user',
                password_hash: null
            });

            if (!usuarioLocal) {
                throw new AppError('Error al sincronizar el usuario en la base de datos.', 500);
            }
        }

        const instituciones = (await this.usuariosRepo.getInstitucionesByUsuarioId(usuarioLocal.id)) || [];

        const token = jwt.sign(
            { userId: usuarioLocal.id },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        return {
            token,
            requiereCompletarPerfil: esNuevoUsuario || instituciones.length === 0,
            usuario: {
                id: usuarioLocal.id,
                nombre: usuarioLocal.nombre,
                apellido: usuarioLocal.apellido,
                email: usuarioLocal.email,
                rol: usuarioLocal.rol,
                foto: usuarioLocal.foto || 'usuarios/default.png',
                instituciones
            }
        };
    };

    asociarInstitucionesGoogle = async (userId: string, institucionesIds: string[]) => {
        if (!institucionesIds || institucionesIds.length === 0) {
            throw new AppError('Debes seleccionar al menos una institución.', 400);
        }

        await this.usuariosRepo.asociarInstituciones(userId, institucionesIds);
        return await this.usuariosRepo.getInstitucionesByUsuarioId(userId);
    };
}

export default new AuthService();