export default class Publicacion {

    constructor(
        public id: string,
        public usuario_id: number,
        public institucion_id: number | null,
        public categoria_id: number | null,
        public nombre: string,
        public descripcion: string | null,
        public fecha_evento: string,
        public latitud: number | null,
        public longitud: number | null,
        public created_at: string,
        public updated_at: string,
        public tipo: string,
        public estado: string
    ) {}
}