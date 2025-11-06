# Verificador QR - UCB

Sitio web simple para GitHub Pages que usa la cámara para escanear códigos QR, llena una tabla con los resultados y permite exportar a Excel (CSV). Es modular, separado por carpetas y responsive.

Estructura principal:
- `index.html` — página principal
- `css/style.css` — estilos
- `js/scanner.js` — módulo que gestiona cámara y decodificación (usa jsQR)
- `js/table.js` — maneja la tabla y la exportación a CSV
- `js/main.js` — orquesta la UI

Cómo usar
1. Subir todo el repositorio a GitHub y activar GitHub Pages desde la rama `main` (normalmente `gh-pages` o `main` / `docs/` dependiendo de tu configuración). Si usas `main`, publica desde la raíz.
2. Abrir la página publicada. El sitio pedirá permiso para usar la cámara.
3. Seleccionar la cámara (si hay varias) y pulsar "Iniciar".
4. Cada QR detectado se añade a la tabla. Pulsar "Exportar a Excel (CSV)" para descargar.

Extracción automática (evitar CORS)
---------------------------------
Si quieres que la app extraiga automáticamente los datos desde la URL contenida en el QR (por ejemplo `academico.ucb.edu.bo/...`) hay un problema habitual: muchas páginas no permiten `fetch()` desde el navegador por restricciones CORS. Para resolverlo puedes correr un proxy local que haga la petición por ti y devuelva el HTML o los campos parseados.

Instrucciones para correr el proxy local (Node.js)
1. Asegúrate de tener Node.js instalado (v18 o superior recomendado).
2. Abre una terminal en `server/` y ejecuta:

```powershell
cd d:\Catolica\Centro\Verificador-QR-UCB\server
npm install
npm start
```

3. El proxy arrancará en `http://localhost:9000` y expondrá `GET /fetch?url=<encoded-url>` que devuelve JSON con los campos detectados (name, document, career, email, phone, period, html).
4. Con el proxy corriendo, la app web intentará primero un `fetch()` directo; si falla por CORS, probará automáticamente con `http://localhost:9000/fetch?url=...` y guardará en la tabla los campos devueltos por el proxy.

Seguridad y despliegue
- El proxy sólo debe usarse en entornos de confianza o en intranet; si lo despliegas públicamente, protege el endpoint y valida/limita los dominios que se pueden consultar para evitar abusos.
- Si quieres, puedo añadir una versión del proxy que devuelva solo JSON con los campos ya extraídos (sin el HTML) y con una lista blanca de dominios permitidos.

Notas técnicas y mejoras posibles
- Exportación actual: CSV con BOM para que Excel lo abra correctamente. Si quieres .xlsx, se puede integrar `SheetJS (xlsx)`.
- Decodificador: uso `jsQR` (ligero). Para mejorar reconocimiento en casos difíciles, se puede integrar `@zxing/browser`.
- Seguridad: todo ocurre en cliente, no se envía nada a servidores.

Deploy rápido (Windows PowerShell):
1. Crea un repo en GitHub y haz push del código.
2. En GitHub > Settings > Pages, selecciona la rama `main` y la carpeta `/ (root)`.

Si quieres, puedo:
- Añadir exportación en formato .xlsx con SheetJS.
- Añadir tests o una pequeña página de demostración con ejemplos de QR.
