export default class Institucion {
    constructor(
        public id: string,
        public nombre: string,
        public email: string | null,
        public direccion: string,
        public telefono: string | null,
        public foto: string,
        public latitud: number | null,
        public longitud: number | null,
        public created_at: string,
        public updated_at: string
    ) {}
}