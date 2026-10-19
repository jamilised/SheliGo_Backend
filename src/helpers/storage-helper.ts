import sharp from 'sharp';
import AppError from '../errors/app-error.js';
import { createClient } from '@supabase/supabase-js';

export class StorageHelper {
    private static storageClient: ReturnType<typeof createClient> | null = null;

    private static getSupabaseUrl(): string {
        const supabaseUrl = process.env.SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error('Falta configurar SUPABASE_URL.');
        }

        return supabaseUrl.replace(/\/+$/, '');
    }

    private static getBucketName(): string {
        const bucket = process.env.SUPABASE_BUCKET;
        if (!bucket) {
            throw new Error('Falta configurar SUPABASE_BUCKET.');
        }
        return bucket;
    }

    private static getStorageClient() {
        if (!this.storageClient) {
            const supabaseUrl = this.getSupabaseUrl();
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!serviceRoleKey) {
                throw new Error('Falta configurar el acceso de servidor a Supabase Storage.');
            }

            this.storageClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        }

        return this.storageClient;
    }
    static eliminarObjeto = async (relativePath: string): Promise<void> => {
        await this.eliminarObjetos([relativePath]);
    };

    static eliminarObjetos = async (relativePaths: string[]): Promise<void> => {
        if (relativePaths.length === 0) return;

        const { error } = await this.getStorageClient()
            .storage
            .from(this.getBucketName())
            .remove(relativePaths);

        if (error) {
            throw error;
        }
    };

    static readonly DEFAULT_USER_PHOTO = 'usuarios/default.png';

    /**
     * Construye la URL pública de un objeto del bucket.
     * - Si la ruta ya es una URL absoluta (p. ej. avatar de Google) se devuelve tal cual.
     * - Si no hay ruta, usa la foto por defecto de usuario.
     */
    static buildUrl(relativePath: string | null | undefined): string {
        const objectPath = relativePath || this.DEFAULT_USER_PHOTO;
        if (/^https?:\/\//i.test(objectPath)) {
            return objectPath;
        }
        return `${this.getSupabaseUrl()}/storage/v1/object/public/${this.getBucketName()}/${objectPath}`;
    }

    /**
     * Igual que buildUrl, pero devuelve null cuando no hay archivo.
     * Se usa para imágenes de publicaciones e instituciones, que no deben
     * caer en la foto por defecto de usuario.
     */
    static buildOptionalUrl(relativePath: string | null | undefined): string | null {
        return relativePath ? this.buildUrl(relativePath) : null;
    }

    static optimizarYSubir = async (
        fileBuffer: Buffer,
        folder: string,
        fileName: string,
        opciones?: {
            width?: number;
            height?: number;
            fit?: 'cover' | 'contain' | 'inside' | 'fill'
        }
    ): Promise<string | null> => {

        // Tope de píxeles: una imagen chica comprimida puede ocupar GB al decodificarse
        let pipeline = sharp(fileBuffer, { limitInputPixels: 40_000_000 });
        try {
            await pipeline.metadata();
        } catch {
            throw new AppError('El archivo no es una imagen válida o es demasiado grande.', 400);
        }

        try {

            if (opciones?.width || opciones?.height) {

                pipeline = pipeline.resize(
                    opciones.width,
                    opciones.height,
                    {
                        fit: opciones.fit || "cover",
                        withoutEnlargement: true
                    }
                );

            } else {

                pipeline = pipeline.resize(
                    1200,
                    1200,
                    {
                        fit: "inside",
                        withoutEnlargement: true
                    }
                );

            }

            let bufferOptimizado: Buffer;
            try {
                bufferOptimizado = await pipeline.jpeg({ quality: 80 }).toBuffer();
            } catch {
                throw new AppError('El archivo no es una imagen válida o es demasiado grande.', 400);
            }

            const fotoFinalPath =
                `${folder}/${fileName}`;

            const storageUrl =
                `${this.getSupabaseUrl()}/storage/v1/object/${this.getBucketName()}/${fotoFinalPath}`;

            const supabaseToken =
                process.env.SUPABASE_SERVICE_ROLE_KEY || "";

            const response = await fetch(storageUrl, {

                method: "PUT",

                body: new Uint8Array(bufferOptimizado),

                headers: {

                    "Content-Type": "image/jpeg",

                    "x-upsert": "true",

                    Authorization: `Bearer ${supabaseToken}`,

                    apikey: supabaseToken

                }

            });

            if (!response.ok) {
                console.error(
                    'La carga del archivo en Supabase Storage falló.',
                    { status: response.status }
                );

                return null;

            }

            return fotoFinalPath;

        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
            if (causeCode && /CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(causeCode)) {
                console.error(
                    `No se pudo conectar de forma segura con Supabase Storage (${causeCode}). ` +
                    'La red está interceptando HTTPS (proxy/antivirus) y su certificado no está instalado ' +
                    'en el sistema operativo. Usá Node 22.19+ o configurá NODE_EXTRA_CA_CERTS con el ' +
                    'certificado de la red.'
                );
            } else {
                console.error('No se pudo procesar o cargar el archivo.', error);
            }
            return null;
        }

    };
}