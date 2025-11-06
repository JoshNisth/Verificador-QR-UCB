# Guía de Despliegue en GitHub Pages

## Pasos para desplegar en GitHub Pages:

1. **Ir a la configuración del repositorio**
   - Ve a tu repositorio en GitHub
   - Haz clic en "Settings" (Configuración)

2. **Configurar GitHub Pages**
   - En el menú lateral, busca "Pages" en la sección "Code and automation"
   - En "Source", selecciona la rama que deseas desplegar (ej: `main` o `master`)
   - Selecciona la carpeta `/` (root)
   - Haz clic en "Save"

3. **Esperar el despliegue**
   - GitHub Pages construirá automáticamente tu sitio
   - El proceso puede tardar unos minutos
   - Una vez completado, verás la URL de tu sitio

4. **Acceder a tu aplicación**
   - La URL será: `https://[tu-usuario].github.io/Verificador-QR-UCB/`
   - Ejemplo: `https://JoshNisth.github.io/Verificador-QR-UCB/`

## Permisos necesarios:

### Permisos de cámara
La aplicación necesitará acceso a la cámara del dispositivo:
- En navegadores de escritorio: Se mostrará un mensaje solicitando permiso
- En dispositivos móviles: El navegador solicitará permiso la primera vez

### HTTPS requerido
- GitHub Pages sirve automáticamente el sitio con HTTPS
- Esto es necesario porque `getUserMedia` (acceso a la cámara) solo funciona en contextos seguros (HTTPS)

## Pruebas locales:

Si deseas probar la aplicación localmente antes de desplegar:

```bash
# Opción 1: Python
python3 -m http.server 8080

# Opción 2: Node.js
npx http-server

# Opción 3: PHP
php -S localhost:8080
```

Luego abre: `http://localhost:8080`

## Notas importantes:

1. **Cámara local**: Para pruebas locales, algunos navegadores permiten `getUserMedia` en `localhost` sin HTTPS
2. **Producción**: En producción (GitHub Pages), el sitio usará HTTPS automáticamente
3. **Navegadores compatibles**: Chrome, Firefox, Safari, Edge (versiones modernas)
4. **Dispositivos móviles**: Funciona en iOS Safari y Android Chrome

## Solución de problemas:

### La cámara no funciona:
- Verifica que hayas dado permiso al navegador
- Asegúrate de que estás usando HTTPS (GitHub Pages lo hace automáticamente)
- Verifica que tu dispositivo tenga una cámara disponible

### Las librerías no cargan:
- Verifica tu conexión a internet
- Los CDN (jsQR y XLSX) deben ser accesibles
- Revisa la consola del navegador para errores

### El sitio no se actualiza:
- Limpia el caché del navegador (Ctrl + F5 o Cmd + Shift + R)
- Espera unos minutos, GitHub Pages puede tardar en actualizar

## Mantenimiento:

Para actualizar el sitio:
1. Haz cambios en tu repositorio
2. Haz commit y push a la rama configurada en GitHub Pages
3. GitHub Pages se actualizará automáticamente en unos minutos
