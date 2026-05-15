import fs from 'fs';

class LogHelper {
    private filePath: string;
    private fileName: string;
    private logToFileEnabled: boolean;
    private logToConsoleEnabled: boolean;

    constructor() {
        this.filePath = process.env.LOG_FILE_PATH || '';
        this.fileName = process.env.LOG_FILE_NAME || '';

        this.logToFileEnabled =
            process.env.LOG_TO_FILE_ENABLED?.toLowerCase() === 'true';

        this.logToConsoleEnabled =
            process.env.LOG_TO_CONSOLE_ENABLED?.toLowerCase() === 'true';
    }

    /**
     * Este metodo almacena en un archivo de texto y/o muestra por consola informacion del Error.
     */
    logError = (errorObject: Error): void => {
        // Formatear el objeto de error
        const formattedError = this.formatError(errorObject);
        const fullFileName = this.getFullFileName();

        if (this.logToFileEnabled) {
            // Escribir el error en el archivo de registro
            fs.appendFile(fullFileName, formattedError + '\n', (err) => {
                if (err) {
                    console.error(
                        'LogHelper: Error al escribir en el archivo de registro:',
                        err
                    );
                }
            });
        }

        if (this.logToConsoleEnabled) {
            console.log(formattedError);
        }
    };

    formatError = (errorObject: Error): string => {
        // Obtener la fecha y hora actual
        const timestamp = new Date().toISOString();

        // Crear el mensaje de error formateado
        let formattedError = `${timestamp}: ${errorObject.name} - ${errorObject.message}\n`;
        formattedError += `Stack Trace:\n${errorObject.stack}\n`;

        return formattedError;
    };

    getFullFileName = (): string => {
        let returnValue = this.filePath;
        let onlyFileName: string;

        if (this.fileName === '') {
            onlyFileName = `${this.getCurrentDate()}.log`;
        } else {
            onlyFileName = `${this.getCurrentDate()}-${this.fileName}`;
        }

        returnValue = `${this.filePath}${onlyFileName}`;

        return returnValue;
    };

    getCurrentDate = (): string => {
        // Obtiene la fecha actual en formato YYYY-MM-DD
        return new Date().toISOString().slice(0, 10);
    };
}

export default new LogHelper();