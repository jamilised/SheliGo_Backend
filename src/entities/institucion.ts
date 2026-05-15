export default class Institucion {
    constructor(
        public id: number,
        public nombre: string,
        public email: string | null,
        public direccion: string,
        public telefono: string | null,
        public foto: string,
        public created_at: string,
        public updated_at: string
    ) {}
}