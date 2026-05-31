export class StorageHelper {
    // Dejamos la URL base guardada acá
    private static readonly SUPABASE_STORAGE_URL = 'https://evovbsxgvzljkbcheipp.supabase.co/storage/v1/object/public/avatars/';
    static buildUrl(relativePath: string | null | undefined): string {
        if (!relativePath) {
            // Imagen por defecto global por si el registro no tiene foto
            return 'https://www.publicdomainpictures.net/pictures/200000/velka/placeholder-bege.jpg';
        }
        return `${this.SUPABASE_STORAGE_URL}${relativePath}`;
    }
}