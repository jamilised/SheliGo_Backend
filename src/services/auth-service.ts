import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import UsuariosRepository from '../repositories/usuarios-repository.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import AppError from '../errors/app-error.js';
import { BCRYPT_SALT_ROUNDS, getJwtSecret } from '../configs/security-config.js';

class AuthService {
    private usuariosRepo = UsuariosRepository;

    login = async (email: string, password: string) => {
        const usuario = await this.usuariosRepo.getByEmail(
            email.toLowerCase().trim()
        );
        if (!usuario) {
            throw new AppError('Credenciales inválidas', 401);
        }

        if (!usuario.password_hash) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            throw new AppError('Credenciales inválidas', 401);
        }

        return this.armarSesion(usuario);
    };
    register = async (body: any, archivoImagen?: Express.Multer.File) => {
        const { nombre, apellido, email, telefono, password, instituciones_ids } = body;

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

        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
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

    /*
    Sesión de la app (JWT propio) con los datos que el frontend necesita.
    La comparten el login con email y el de Google.
    */
    private armarSesion = async (usuario: {
        id: string;
        nombre: string;
        apellido: string;
        email: string;
        rol: string;
        foto: string | null;
    }) => {
        const instituciones = (await this.usuariosRepo.getInstitucionesByUsuarioId(usuario.id)) || [];
        const token = jwt.sign({ userId: usuario.id }, getJwtSecret(), { expiresIn: '1d' });

        return {
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
                foto: StorageHelper.buildUrl(usuario.foto),
                instituciones
            }
        };
    };

    // Valida el token de Supabase (Google) y devuelve los datos de la cuenta
    private getCuentaGoogle = async (tokenSupabase: string) => {
        const { supabase } = await import('../database/supabase.js');

        const { data: { user }, error } = await supabase.auth.getUser(tokenSupabase);
        if (error || !user) {
            throw new AppError('Token de Google/Supabase inválido o expirado.', 401);
        }

        const email = user.email?.toLowerCase().trim();
        if (!email) {
            throw new AppError('La cuenta de Google no tiene un correo electrónico asociado.', 400);
        }

        const fullName = (user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario Google').trim();
        const espacioIndex = fullName.indexOf(' ');

        return {
            id: user.id,
            email,
            nombre: espacioIndex > 0 ? fullName.substring(0, espacioIndex) : fullName,
            apellido: espacioIndex > 0 ? fullName.substring(espacioIndex + 1) : ' '
        };
    };

    // Usuario local de una cuenta de Google: por id de Supabase o, si se registró con email, por correo
    private getUsuarioLocalGoogle = async (cuenta: { id: string; email: string }) =>
        (await this.usuariosRepo.getById(cuenta.id)) ?? (await this.usuariosRepo.getByEmail(cuenta.email));

    /*
    Login con Google. Solo entrega la sesión de la app a usuarios que ya
    completaron el onboarding (tienen al menos una institución). Si no, no se
    crea nada ni se emite token: el frontend debe pasar por
    completarRegistroGoogle, que es donde se crea el usuario.
    */
    loginConGoogle = async (tokenSupabase: string) => {
        const cuenta = await this.getCuentaGoogle(tokenSupabase);
        const usuarioLocal = await this.getUsuarioLocalGoogle(cuenta);

        if (usuarioLocal) {
            const instituciones = (await this.usuariosRepo.getInstitucionesByUsuarioId(usuarioLocal.id)) || [];
            if (instituciones.length > 0) {
                return { requiereCompletarPerfil: false, ...(await this.armarSesion(usuarioLocal)) };
            }
        }

        return {
            requiereCompletarPerfil: true,
            perfil: { nombre: cuenta.nombre, apellido: cuenta.apellido, email: cuenta.email }
        };
    };

    /*
    Último paso del registro con Google: crea el usuario (si no existía) junto
    con sus instituciones en una sola transacción y recién entonces emite la
    sesión. Si la persona abandona antes, no queda ningún usuario creado.
    */
    completarRegistroGoogle = async (tokenSupabase: string, institucionesIds: string[]) => {
        const idsUnicos = [...new Set(institucionesIds ?? [])];
        if (idsUnicos.length === 0) {
            throw new AppError('Debes seleccionar al menos una institución.', 400);
        }

        const cuenta = await this.getCuentaGoogle(tokenSupabase);
        let usuarioLocal = await this.getUsuarioLocalGoogle(cuenta);

        if (usuarioLocal) {
            // Cuenta creada antes de este cambio (sin instituciones) o que ya las tenía
            await this.usuariosRepo.asociarInstituciones(usuarioLocal.id, idsUnicos);
        } else {
            try {
                const { usuario } = await this.usuariosRepo.createWithInstitutions({
                    id: cuenta.id,
                    nombre: cuenta.nombre,
                    apellido: cuenta.apellido,
                    email: cuenta.email,
                    telefono: null,
                    rol: 'user',
                    password_hash: null
                }, idsUnicos, StorageHelper.DEFAULT_USER_PHOTO);
                usuarioLocal = usuario;
            } catch (error) {
                // Doble envío del formulario: el usuario ya se creó en la otra request
                if ((error as { code?: unknown })?.code !== '23505') throw error;
                usuarioLocal = await this.getUsuarioLocalGoogle(cuenta);
                if (!usuarioLocal) throw error;
                await this.usuariosRepo.asociarInstituciones(usuarioLocal.id, idsUnicos);
            }
        }

        return this.armarSesion(usuarioLocal);
    };
};

export default new AuthService();