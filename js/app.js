/**
 * Módulo principal de la aplicación
 * Coordina la interacción entre el escáner QR y la tabla de datos
 */

import { QRScanner } from './modules/qr-scanner.js';
import { DataTable } from './modules/data-table.js';
import { ExcelExporter } from './modules/excel-exporter.js';

class App {
    constructor() {
        this.qrScanner = null;
        this.dataTable = null;
        this.excelExporter = null;
        this.init();
    }

    init() {
        // Inicializar módulos
        this.dataTable = new DataTable('tableBody', 'emptyState');
        this.excelExporter = new ExcelExporter();
        this.qrScanner = new QRScanner('video', 'canvas', this.handleQRCode.bind(this));

        // Configurar event listeners
        this.setupEventListeners();
        
        // Mostrar mensaje de bienvenida
        this.showStatus('Haz clic en "Iniciar Escáner" para comenzar', 'info');
    }

    setupEventListeners() {
        // Botones del escáner
        document.getElementById('startBtn').addEventListener('click', () => this.startScanner());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopScanner());

        // Botones de la tabla
        document.getElementById('clearBtn').addEventListener('click', () => this.clearTable());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToExcel());
    }

    async startScanner() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');

        try {
            await this.qrScanner.start();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            this.showStatus('Escáner activo. Muestra un código QR a la cámara.', 'info');
        } catch (error) {
            console.error('Error al iniciar escáner:', error);
            this.showStatus('Error al acceder a la cámara. Por favor, permite el acceso a la cámara.', 'error');
        }
    }

    stopScanner() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');

        this.qrScanner.stop();
        startBtn.disabled = false;
        stopBtn.disabled = true;
        this.showStatus('Escáner detenido.', 'info');
    }

    handleQRCode(data) {
        // Agregar datos a la tabla
        this.dataTable.addRow(data);
        
        // Mostrar mensaje de éxito
        this.showStatus(`✓ Código escaneado: ${data}`, 'success');
        
        // Opcional: detener el escáner después de un escaneo exitoso
        // this.stopScanner();
    }

    clearTable() {
        if (confirm('¿Estás seguro de que deseas limpiar todos los datos?')) {
            this.dataTable.clearAll();
            this.showStatus('Tabla limpiada.', 'info');
        }
    }

    exportToExcel() {
        const data = this.dataTable.getData();
        
        if (data.length === 0) {
            this.showStatus('No hay datos para exportar.', 'error');
            return;
        }

        try {
            this.excelExporter.export(data, 'datos-qr-ucb');
            this.showStatus('✓ Datos exportados a Excel correctamente.', 'success');
        } catch (error) {
            console.error('Error al exportar:', error);
            this.showStatus('Error al exportar los datos.', 'error');
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Limpiar el mensaje después de 5 segundos (excepto para mensajes de info persistentes)
        if (type !== 'info' || message.includes('✓')) {
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }
            }, 5000);
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
