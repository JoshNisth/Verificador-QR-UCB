// Módulo: scanner.js
// Provee funciones para iniciar/detener el escaneo de QR usando la cámara

let _stream = null;
let _animationId = null;

export async function listVideoDevices(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d=>d.kind === 'videoinput');
}

export async function startScanner({videoElement, deviceId=null, onDecode, statusCallback}){
  stopScanner();
  const constraints = {video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}};
  if(deviceId) constraints.video.deviceId = {exact:deviceId};

  try{
    _stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = _stream;
    await videoElement.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scanFrame = ()=>{
      if(videoElement.readyState === videoElement.HAVE_ENOUGH_DATA){
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement,0,0,canvas.width,canvas.height);
        const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height) : null;
        if(code){
          // notify with full code object (data + location)
          onDecode && onDecode(code);
          statusCallback && statusCallback('QR detectado');
        }
      }
      _animationId = requestAnimationFrame(scanFrame);
    };

    _animationId = requestAnimationFrame(scanFrame);
    statusCallback && statusCallback('Cámara activa');
    return true;
  }catch(err){
    console.error('startScanner error',err);
    statusCallback && statusCallback('Error: ' + (err.message||err));
    return false;
  }
}

export function stopScanner(){
  if(_animationId) cancelAnimationFrame(_animationId);
  _animationId = null;
  if(_stream){
    _stream.getTracks().forEach(t=>t.stop());
    _stream = null;
  }
}
