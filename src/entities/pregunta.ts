export default class Pregunta {

    constructor(
        public id: string,
        public publicacion_id: string,
        public usuario_id: string,
        public pregunta: string,
        public created_at: string
    ) {}

}