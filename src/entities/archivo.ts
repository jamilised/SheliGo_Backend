export default class Archivo {

    constructor(
        public id: string,
        public publicacion_id: string,
        public url: string,
        public mime_type: string,
        public es_principal: boolean,
        public created_at: string
    ) {}

}