import tls from 'node:tls'

/*
Hace que Node.js confíe también en los certificados instalados en el sistema
operativo (almacén de Windows / macOS / Linux), además de los que trae Node.

Es necesario en redes que inspeccionan HTTPS (escuelas, empresas, antivirus):
el navegador confía en el certificado de la red porque está instalado en el
sistema, pero Node.js no, y las llamadas a Supabase (Storage y login con
Google) fallan con SELF_SIGNED_CERT_IN_CHAIN.

No desactiva la verificación TLS: solo se aceptan certificados en los que el
propio sistema operativo ya confía. Se puede desactivar con USE_SYSTEM_CA=false.
*/
export const configureTlsTrust = (): void => {
    if (process.env.USE_SYSTEM_CA === 'false') {
        return
    }

    // Disponible desde Node 22.19 / 24.5
    if (
        typeof tls.getCACertificates !== 'function' ||
        typeof tls.setDefaultCACertificates !== 'function'
    ) {
        console.warn(
            `Node ${process.version} no permite cargar los certificados del sistema. ` +
            'Si la red intercepta HTTPS, actualizá Node a 22.19+ o configurá NODE_EXTRA_CA_CERTS.'
        )
        return
    }

    try {
        const certificados = new Set([
            ...tls.getCACertificates('default'),
            ...tls.getCACertificates('system')
        ])
        tls.setDefaultCACertificates([...certificados])
    } catch (error) {
        console.warn('No se pudieron cargar los certificados del sistema operativo:', error)
    }
}

configureTlsTrust()
