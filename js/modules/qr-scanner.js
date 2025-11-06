/**
 * Módulo QR Scanner
 * Maneja el acceso a la cámara y el escaneo de códigos QR
 */

export class QRScanner {
    constructor(videoElementId, canvasElementId, onQRCodeDetected) {
        this.video = document.getElementById(videoElementId);
        this.canvas = document.getElementById(canvasElementId);
        this.canvasContext = this.canvas.getContext('2d');
        this.onQRCodeDetected = onQRCodeDetected;
        this.stream = null;
        this.scanInterval = null;
        this.lastScannedCode = null;
        this.lastScannedTime = 0;
        this.scanCooldown = 2000; // 2 segundos entre escaneos del mismo código
    }

    async start() {
        try {
            // Solicitar acceso a la cámara
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Usar cámara trasera si está disponible
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', true); // Para iOS
            await this.video.play();

            // Ajustar el tamaño del canvas al video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Iniciar el escaneo continuo
            this.scanInterval = setInterval(() => this.scan(), 100);
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            throw error;
        }
    }

    scan() {
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            // Dibujar el frame actual del video en el canvas
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.canvasContext.drawImage(
                this.video, 
                0, 
                0, 
                this.canvas.width, 
                this.canvas.height
            );

            // Obtener los datos de imagen del canvas
            const imageData = this.canvasContext.getImageData(
                0, 
                0, 
                this.canvas.width, 
                this.canvas.height
            );

            // Buscar código QR en la imagen
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                this.handleDetectedCode(code.data);
            }
        }
    }

    handleDetectedCode(codeData) {
        const currentTime = Date.now();
        
        // Evitar escaneos duplicados del mismo código en un corto período de tiempo
        if (codeData === this.lastScannedCode && 
            currentTime - this.lastScannedTime < this.scanCooldown) {
            return;
        }

        this.lastScannedCode = codeData;
        this.lastScannedTime = currentTime;

        // Notificar al callback
        if (this.onQRCodeDetected) {
            this.onQRCodeDetected(codeData);
        }

        // Efecto visual: parpadeo del video
        this.flashVideo();
    }

    flashVideo() {
        this.video.style.opacity = '0.5';
        setTimeout(() => {
            this.video.style.opacity = '1';
        }, 200);
    }

    stop() {
        // Detener el escaneo
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        // Detener el stream de la cámara
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Limpiar el video
        this.video.srcObject = null;

        // Resetear el estado
        this.lastScannedCode = null;
        this.lastScannedTime = 0;
    }
}
