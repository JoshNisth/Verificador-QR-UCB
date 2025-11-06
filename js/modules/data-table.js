/**
 * Módulo Data Table
 * Maneja la tabla de datos escaneados
 */

export class DataTable {
    constructor(tableBodyId, emptyStateId) {
        this.tableBody = document.getElementById(tableBodyId);
        this.emptyState = document.getElementById(emptyStateId);
        this.data = [];
        this.updateEmptyState();
    }

    addRow(qrData) {
        // Crear objeto de datos
        const entry = {
            id: this.data.length + 1,
            qrCode: qrData,
            timestamp: new Date(),
        };

        // Agregar a los datos
        this.data.push(entry);

        // Crear fila en la tabla
        const row = this.createTableRow(entry);
        this.tableBody.insertBefore(row, this.tableBody.firstChild); // Insertar al inicio

        // Actualizar estado vacío
        this.updateEmptyState();

        // Animar la nueva fila
        row.classList.add('fade-in');
    }

    createTableRow(entry) {
        const row = document.createElement('tr');
        
        // Columna de número
        const idCell = document.createElement('td');
        idCell.textContent = entry.id;
        row.appendChild(idCell);

        // Columna de código QR
        const qrCell = document.createElement('td');
        qrCell.textContent = entry.qrCode;
        qrCell.style.wordBreak = 'break-all';
        row.appendChild(qrCell);

        // Columna de fecha y hora
        const dateCell = document.createElement('td');
        dateCell.textContent = this.formatDateTime(entry.timestamp);
        row.appendChild(dateCell);

        // Columna de acciones
        const actionsCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.onclick = () => this.deleteRow(entry.id, row);
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);

        return row;
    }

    deleteRow(id, rowElement) {
        // Eliminar de los datos
        this.data = this.data.filter(entry => entry.id !== id);

        // Eliminar de la tabla
        rowElement.remove();

        // Actualizar estado vacío
        this.updateEmptyState();
    }

    clearAll() {
        this.data = [];
        this.tableBody.innerHTML = '';
        this.updateEmptyState();
    }

    getData() {
        return this.data.map(entry => ({
            'Número': entry.id,
            'Código QR': entry.qrCode,
            'Fecha y Hora': this.formatDateTime(entry.timestamp)
        }));
    }

    updateEmptyState() {
        if (this.data.length === 0) {
            this.emptyState.classList.add('show');
            this.tableBody.parentElement.style.display = 'none';
        } else {
            this.emptyState.classList.remove('show');
            this.tableBody.parentElement.style.display = 'table';
        }
    }

    formatDateTime(date) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        // Use 'es' locale for better browser compatibility
        return new Intl.DateTimeFormat('es', options).format(date);
    }
}
