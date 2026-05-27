export default class Pregunta {

    constructor(
        public id: string,
        public publicacion_id: string,
        public usuario_id: string,
        public contenido: string,
        public created_at: string
    ) {}

}