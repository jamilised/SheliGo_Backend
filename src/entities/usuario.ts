export default class Usuario {

    constructor(
        public id: string,
        public nombre: string,
        public apellido: string,
        public email: string,
        public telefono: string | null,
        public created_at: string,
        public updated_at: string,
        public rol: string // 'user' | 'admin'
    ) {}
}