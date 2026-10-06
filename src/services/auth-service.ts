import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
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

    register = async (body: any, archivoImagen?: Express.Multer.File) => {
        const { nombre, apellido, email, telefono, password, instituciones_ids } = body;

        console.log('⚡ SERVICIO AUTH: Iniciando proceso de registro para:', email);
        let arrayInstituciones: string[] = [];
        if (Array.isArray(instituciones_ids)) {
            arrayInstituciones = instituciones_ids;
        } else if (typeof instituciones_ids === 'string') {
            try {
            const parsed = JSON.parse(instituciones_ids);
            arrayInstituciones = Array.isArray(parsed) ? parsed : [instituciones_ids];
            } catch {
            arrayInstituciones = [instituciones_ids];
            }
        }

        arrayInstituciones = [...new Set(arrayInstituciones)];
        if (arrayInstituciones.length === 0) {
            throw new AppError('Debes seleccionar al menos una institución para registrarte.', 400);
        }

        const emailNormalizado = email.toLowerCase().trim();
        const usuarioExistente = await this.usuariosRepo.getByEmail(emailNormalizado);
        if (usuarioExistente) {
            throw new AppError('El correo electrónico ya se encuentra registrado.', 409);
        }

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const usuarioId = randomUUID();
        let fotoFinalPath = 'usuarios/default.png';

        if (archivoImagen) {
            const pathSubido = await StorageHelper.optimizarYSubir(
            archivoImagen.buffer,
            'usuarios',
            `${usuarioId}.jpg`,
            { width: 400, height: 400, fit: 'cover' }
            );

            if (!pathSubido) {
            throw new AppError('No se pudo guardar la imagen de perfil. El registro no fue creado.', 502);
            }

            fotoFinalPath = pathSubido;
        }

        try {
            const resultado = await this.usuariosRepo.createWithInstitutions({
            id: usuarioId,
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: emailNormalizado,
            telefono: telefono ? telefono.toString().trim() : null,
            rol: 'user',
            password_hash: passwordHash
            }, arrayInstituciones, fotoFinalPath);

            return {
            ...resultado.usuario,
            instituciones: resultado.instituciones
            };
        } catch (error) {
            if (archivoImagen && fotoFinalPath !== 'usuarios/default.png') {
            try {
                await StorageHelper.eliminarObjeto(fotoFinalPath);
            } catch (cleanupError) {
                console.error('Falló el registro y no se pudo limpiar la foto subida.', {
                    error,
                    cleanupError
                });
                throw new AppError(
                    'No se pudo completar el registro ni limpiar la imagen. Contacta con soporte.',
                    502
                );
            }
            }
            throw error;
        }
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