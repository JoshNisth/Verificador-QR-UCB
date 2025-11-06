/**
 * Módulo Excel Exporter
 * Maneja la exportación de datos a formato Excel
 */

export class ExcelExporter {
    constructor() {
        // Verificar que la librería XLSX esté disponible
        if (typeof XLSX === 'undefined') {
            console.error('La librería XLSX no está cargada');
        }
    }

    export(data, filename = 'datos') {
        // Crear un nuevo libro de trabajo
        const workbook = XLSX.utils.book_new();

        // Convertir los datos a una hoja de trabajo
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Ajustar el ancho de las columnas
        const columnWidths = [
            { wch: 10 },  // Número
            { wch: 50 },  // Código QR
            { wch: 20 }   // Fecha y Hora
        ];
        worksheet['!cols'] = columnWidths;

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos QR');

        // Generar el nombre del archivo con timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const fullFilename = `${filename}_${timestamp}.xlsx`;

        // Exportar el archivo
        XLSX.writeFile(workbook, fullFilename);
    }

    exportWithSummary(data, filename = 'datos') {
        // Crear un nuevo libro de trabajo
        const workbook = XLSX.utils.book_new();

        // Hoja principal con datos
        const worksheet = XLSX.utils.json_to_sheet(data);
        const columnWidths = [
            { wch: 10 },
            { wch: 50 },
            { wch: 20 }
        ];
        worksheet['!cols'] = columnWidths;
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos QR');

        // Hoja de resumen
        const summary = [
            { 'Descripción': 'Total de códigos escaneados', 'Valor': data.length },
            { 'Descripción': 'Fecha de exportación', 'Valor': new Date().toLocaleString('es') }
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summary);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

        // Generar el nombre del archivo con timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const fullFilename = `${filename}_${timestamp}.xlsx`;

        // Exportar el archivo
        XLSX.writeFile(workbook, fullFilename);
    }
}
