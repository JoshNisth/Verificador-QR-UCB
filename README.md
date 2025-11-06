# Verificador QR - UCB

Aplicación web para escanear códigos QR usando la cámara del dispositivo y exportar los datos a Excel.

## 🚀 Características

- **Escaneo de QR**: Escanea códigos QR en tiempo real usando la cámara del dispositivo
- **Tabla de datos**: Visualiza todos los códigos escaneados en una tabla organizada
- **Exportación a Excel**: Exporta los datos escaneados a formato Excel (.xlsx)
- **Diseño responsive**: Funciona perfectamente en dispositivos móviles, tablets y escritorio
- **Arquitectura modular**: Código organizado en módulos independientes para fácil mantenimiento

## 📁 Estructura del Proyecto

```
Verificador-QR-UCB/
├── index.html              # Página principal
├── css/
│   ├── styles.css         # Estilos principales
│   └── responsive.css     # Estilos responsive
├── js/
│   ├── app.js            # Aplicación principal
│   └── modules/
│       ├── qr-scanner.js      # Módulo de escaneo QR
│       ├── data-table.js      # Módulo de tabla de datos
│       └── excel-exporter.js  # Módulo de exportación
└── README.md
```

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con variables CSS y diseño responsive
- **JavaScript ES6+**: Módulos, clases y async/await
- **jsQR**: Librería para escaneo de códigos QR
- **SheetJS (XLSX)**: Librería para exportación a Excel

## 📱 Uso

1. Abre la aplicación en tu navegador
2. Haz clic en "Iniciar Escáner" para activar la cámara
3. Apunta la cámara a un código QR
4. El código se agregará automáticamente a la tabla
5. Puedes eliminar entradas individuales o limpiar toda la tabla
6. Exporta los datos a Excel haciendo clic en "Exportar a Excel"

## 🌐 Despliegue en GitHub Pages

1. Ve a la configuración del repositorio en GitHub
2. En la sección "Pages", selecciona la rama principal (main/master)
3. La aplicación estará disponible en: `https://[usuario].github.io/Verificador-QR-UCB/`

## 🔒 Permisos

La aplicación requiere acceso a la cámara del dispositivo. Asegúrate de permitir el acceso cuando el navegador lo solicite.

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Autor

Universidad Católica Boliviana - UCB