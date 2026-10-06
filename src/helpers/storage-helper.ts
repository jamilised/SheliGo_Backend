import sharp from 'sharp';
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

    static buildUrl(relativePath: string | null | undefined): string {
        const objectPath = relativePath || 'usuarios/default.png';
        return `${this.getSupabaseUrl()}/storage/v1/object/public/${this.getBucketName()}/${objectPath}`;
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

        try {

            let pipeline = sharp(fileBuffer);

            await pipeline.metadata();

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

            const bufferOptimizado =
                await pipeline
                    .jpeg({
                        quality: 80
                    })
                    .toBuffer();

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
            console.error('No se pudo procesar o cargar el archivo.', error);
            return null;
        }

    };
}