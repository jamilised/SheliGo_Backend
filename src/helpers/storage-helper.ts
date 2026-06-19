import sharp from 'sharp';

export class StorageHelper {
    private static readonly SUPABASE_STORAGE_URL = 'https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/public/avatars/';

    static buildUrl(relativePath: string | null | undefined): string {
        if (!relativePath) {
            return 'https://www.publicdomainpictures.net/pictures/200000/velka/placeholder-bege.jpg';
        }
        return `${this.SUPABASE_STORAGE_URL}${relativePath}`;
    }

    static optimizarYSubir = async (
        fileBuffer: Buffer, 
        folder: string, 
        fileName: string,
        opciones?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'inside' | 'fill' }
    ): Promise<string | null> => {
        try {
            console.log(`⚙️ HELPER: Optimizando imagen...`);
            
            // Creamos la instancia base de Sharp
            let pipeline = sharp(fileBuffer);

            // Si el servicio especificó dimensiones, las aplicamos. 
            // Si no, le ponemos un techo de 1200px para cuidar el espacio en Supabase sin deformar (inside)
            if (opciones?.width || opciones?.height) {
                pipeline = pipeline.resize(opciones.width, opciones.height, {
                    fit: opciones.fit || 'cover',
                    withoutEnlargement: true // Evita que si la foto es chica se pixelee agrandándose
                });
            } else {
                pipeline = pipeline.resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Convertimos a JPEG y bajamos peso
            const bufferOptimizado = await pipeline
                .jpeg({ quality: 80 })
                .toBuffer();

            const fotoFinalPath = `${folder}/${fileName}`;
            const storageUrl = `https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/avatars/${fotoFinalPath}`;
            const supabaseToken = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
                console.error(`❌ HELPER ERROR: Supabase rechazó el archivo:`, response.status, errorTexto);
                return null;
            }

            return fotoFinalPath;
        } catch (error) {
            console.error('❌ HELPER ERROR: Fallo crítico:', error);
            return null;
        }
    };
}