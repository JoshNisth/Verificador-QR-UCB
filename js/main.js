import { listVideoDevices, startScanner, stopScanner } from './scanner.js';
import { initTable, addRow, clear, exportCSV } from './table.js';

const video = document.getElementById('video');
const deviceSelect = document.getElementById('deviceSelect');
const statusEl = document.getElementById('status');
const resultsTable = document.getElementById('resultsTable');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const overlay = document.getElementById('overlay');

let currentDeviceId = null;
let lastScanned = null; // debounce
let scanningPaused = false; // when true, ignore detections until resumed
const seenUrls = new Set(); // avoid duplicate registrations per session
let currentAbortController = null;
let resolveInProgress = false;
let autoCloseTimer = null;

// sizing overlay to match video
function resizeOverlay(){
  if(!video || !overlay) return;
  overlay.width = video.clientWidth;
  overlay.height = video.clientHeight;
}

window.addEventListener('resize', resizeOverlay);

function setStatus(msg){ statusEl.textContent = 'Estado: ' + msg; }

async function populateDevices(){
  try{
    const devices = await listVideoDevices();
    deviceSelect.innerHTML = '';
    devices.forEach(d=>{
      const opt = document.createElement('option');
      opt.value = d.deviceId; opt.textContent = d.label || `Cámara ${deviceSelect.length+1}`;
      deviceSelect.appendChild(opt);
    });
    if(devices[0]){ currentDeviceId = devices[0].deviceId; }
  }catch(err){
    console.warn(err);
  }
}

deviceSelect.addEventListener('change', async e=>{
  // restart scanner with the selected device
  currentDeviceId = e.target.value;
  try{ stopScanner(); }catch(_){}
  await startScanning();
});

async function startScanning(){
  setStatus('iniciando cámara...');
  const ok = await startScanner({
    videoElement: video,
    deviceId: currentDeviceId,
    onDecode: async (code)=>{
      if(scanningPaused) return; // ignore while paused
      const text = code && code.data ? code.data : '';
      if(!text) return;

      // micro-debounce to avoid many detections in quick succession
      if(text && text === lastScanned) return;
      lastScanned = text;
      setTimeout(()=>{ lastScanned = null; }, 800);

      try{ drawBoundingBox(code); }catch(e){}

      // If URL and already seen in this session, ignore
      try{
        const u = new URL(text);
        if(seenUrls.has(u.href)){
          setStatus('duplicado (ya registrado)');
          return;
        }
      }catch(_){ }

      // Pause scanning and show overlay while resolving (abortable)
      currentAbortController = new AbortController();
      resolveInProgress = true;
      pauseForResolve();
      let parsed;
      try{
        parsed = await resolveQrContent(text, currentAbortController.signal);
      }catch(err){
        // aborted or network error
        if(err && err.name === 'AbortError'){
          setStatus('cancelado');
        }else{
          console.warn('resolveQrContent error', err);
          setStatus('error al resolver');
        }
        // resume scanning
        scanningPaused = false;
        currentAbortController = null;
        resolveInProgress = false;
        return;
      }
      addRow(resultsTable, parsed);

      // mark seen URL to avoid duplicates
      if(parsed && parsed.url) seenUrls.add(parsed.url);

      // show success message; change overlay to 'Continuar' and auto-close
      currentAbortController = null;
      resolveInProgress = false;
      showPostScan(parsed);
    },
    statusCallback: (s)=> setStatus(s)
  });
  resizeOverlay();
  return ok;
}

function stopScanning(){
  try{ stopScanner(); }catch(_){}
  if(overlay){ const ctx = overlay.getContext('2d'); ctx && ctx.clearRect(0,0,overlay.width, overlay.height); }
  setStatus('detenido');
}

// Overlay UI helpers (pause/resume + messages)
const overlayUi = document.getElementById('overlayUi');
const overlayMessage = document.getElementById('overlayMessage');
const continueBtn = document.getElementById('continueBtn');

function pauseForResolve(){
  scanningPaused = true;
  if(overlayUi){ overlayUi.classList.remove('hidden'); overlayUi.setAttribute('aria-hidden','false'); }
  if(overlayMessage) overlayMessage.textContent = 'Consultando...';
  // show cancel button while resolving
  if(continueBtn) continueBtn.textContent = 'Cancelar';
  // clear any pending auto-close timer
  if(autoCloseTimer){ clearTimeout(autoCloseTimer); autoCloseTimer = null; }
}

function showPostScan(parsed){
  if(overlayMessage){
    overlayMessage.textContent = parsed && (parsed.name || parsed.url) ? 'Registro agregado' : 'Registro agregado (sin datos)';
  }
  if(overlayUi){ overlayUi.classList.remove('hidden'); overlayUi.setAttribute('aria-hidden','false'); }
  // switch button to continue and auto-close after 3 seconds
  if(continueBtn) continueBtn.textContent = 'Continuar';
  if(autoCloseTimer) clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(()=>{
    scanningPaused = false;
    if(overlayUi){ overlayUi.classList.add('hidden'); overlayUi.setAttribute('aria-hidden','true'); }
    setStatus('listo');
    lastScanned = null;
    autoCloseTimer = null;
  }, 1000);
}

if(continueBtn){
  continueBtn.addEventListener('click', ()=>{
    // If resolving is in progress, treat this as a cancel
    if(resolveInProgress && currentAbortController){
      try{ currentAbortController.abort(); }catch(e){}
      // abort handler in onDecode will resume scanning and set status
      return;
    }

    // otherwise, it's a Continue action -> hide overlay and resume
    scanningPaused = false;
    if(autoCloseTimer){ clearTimeout(autoCloseTimer); autoCloseTimer = null; }
    if(overlayUi){ overlayUi.classList.add('hidden'); overlayUi.setAttribute('aria-hidden','true'); }
    setStatus('listo');
    lastScanned = null; // allow same code again if necessary
  });
}

exportBtn.addEventListener('click', ()=>{
  const ok = exportCSV();
  if(ok) setStatus('exportado'); else setStatus('no hay datos para exportar');
});

clearBtn.addEventListener('click', ()=>{ clear(resultsTable); setStatus('limpiado'); });

// (Removed file upload handling: scanning is only via camera per requirements)

// Draw bounding box on overlay canvas using code.location from jsQR
function drawBoundingBox(code){
  if(!code || !code.location || !overlay) return;
  const ctx = overlay.getContext('2d');
  // size mapping: jsQR returns coordinates relative to original video resolution
  // scale to displayed video size
  const scaleX = overlay.width / code.location.topLeftCorner.x || 1;
  // Better compute based on video videoWidth/videoHeight vs overlay size
  const vw = video.videoWidth || overlay.width;
  const vh = video.videoHeight || overlay.height;
  const sx = overlay.width / vw;
  const sy = overlay.height / vh;
  ctx.clearRect(0,0,overlay.width, overlay.height);
  ctx.strokeStyle = '#0ef'; ctx.lineWidth = 3; ctx.beginPath();
  const TL = code.location.topLeftCorner;
  const TR = code.location.topRightCorner;
  const BR = code.location.bottomRightCorner;
  const BL = code.location.bottomLeftCorner;
  ctx.moveTo(TL.x * sx, TL.y * sy);
  ctx.lineTo(TR.x * sx, TR.y * sy);
  ctx.lineTo(BR.x * sx, BR.y * sy);
  ctx.lineTo(BL.x * sx, BL.y * sy);
  ctx.closePath(); ctx.stroke();
}

// Try to resolve QR content: if URL try fetch and parse, else return text
async function resolveQrContent(text, signal){
  const result = {text, url: null, name: '', document: '', career: ''};
  if(!text) return result;
  // If looks like URL
  try{
    const url = new URL(text);
    result.url = url.href;
    // attempt to fetch page (may fail due to CORS)
    try{
      const resp = await fetch(url.href, {mode:'cors', signal});
      if(resp.ok){
        const html = await resp.text();
        const parsed = parsePersonFromHTML(html, url.href);
        return Object.assign(result, parsed);
      }else{
        // fallback: return url only
        return result;
      }
    }catch(fetchErr){
      // if aborted, rethrow so caller can handle
      if(fetchErr && fetchErr.name === 'AbortError') throw fetchErr;
      // CORS or network error: try proxy if available (server-side fetch)
      console.warn('fetch error, trying proxy', fetchErr);
      try{
        // proxy expected to run on localhost:9000
        const proxyUrl = 'http://localhost:9000/fetch?url=' + encodeURIComponent(url.href);
        const pr = await fetch(proxyUrl, {signal});
        if(pr.ok){
          const json = await pr.json();
          return Object.assign(result, json);
        }
      }catch(proxyErr){
        if(proxyErr && proxyErr.name === 'AbortError') throw proxyErr;
        console.warn('proxy fetch failed', proxyErr);
      }
      // fallback: return url only
      return result;
    }
  }catch(e){
    // not a URL -> return as text
    result.text = text;
    return result;
  }
}

// Heurística para extraer campos desde el HTML de la página del carnet
function parsePersonFromHTML(html, baseUrl){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body ? doc.body.innerText.replace(/\s+/g,' ').trim() : '';
  const res = {name:'', document:'', career:'', email:'', phone:'', period:''};

  // Nombre
  const nameMatch = text.match(/Nombre\s+Completo[:]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{3,200})/i) || text.match(/Nombre[:]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{3,200})/i);
  if(nameMatch) res.name = nameMatch[1].trim();

  // Documento (CI)
  const docMatch = text.match(/Documento\s+de\s+Identidad[:]?\s*([0-9]{6,12})/i) || text.match(/CI[:]?\s*([0-9]{6,12})/i) || text.match(/Documento[:]?\s*([0-9]{6,12})/i);
  if(docMatch) res.document = docMatch[1].trim();

  // Carrera
  const careerMatch = text.match(/Carrera[:]?\s*([A-ZÁÉÍÓÚÑ\-\s]{3,80})/i) || text.match(/CARRERA[:]?\s*([A-ZÁÉÍÓÚÑ\-\s]{3,80})/i);
  if(careerMatch) res.career = careerMatch[1].trim();

  // Email
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if(emailMatch) res.email = emailMatch[0].trim();

  // Phone (simple heuristics: sequences of 6-13 digits, possibly with +country)
  const phoneMatch = text.match(/(\+?\d[\d\s\-()]{5,}\d)/);
  if(phoneMatch){
    // normalize: keep digits and leading +
    const raw = phoneMatch[0];
    const norm = (raw.match(/\+/) ? '+' : '') + raw.replace(/[^\d]/g,'');
    res.phone = norm;
  }

  // Periodo / Periodo Académico
  const periodMatch = text.match(/Periodo(?:\s+Acad[eé]mico)?[:]?[\s]*([A-Z0-9\-\s]{2,40})/i) || text.match(/Periodo[:]?[\s]*([0-9]{1,2}-[0-9]{4})/i);
  if(periodMatch) res.period = periodMatch[1].trim();

  // Fallbacks: if name empty try grabbing first large uppercase phrase
  if(!res.name){
    const general = text.match(/([A-Z][A-Z\s]{5,80})/);
    if(general) res.name = general[1].trim();
  }

  return res;
}

// Init
initTable(resultsTable);
// Start flow: request permission, populate devices and auto-start scanning
async function initAuto(){
  initTable(resultsTable);
  try{
    // Ask for permission to access camera so device labels become available
    const stream = await navigator.mediaDevices.getUserMedia({video:true});
    // stop immediately - we'll reopen the selected device
    stream.getTracks().forEach(t=>t.stop());
  }catch(e){
    // permission denied or no camera
    console.warn('camera permission denied or not present', e);
  }

  await populateDevices();

  // Prefer a back camera if available (common labels contain 'back' or 'rear' or 'environment')
  try{
    const opts = Array.from(deviceSelect.options).map(o=>({id:o.value,label:o.text}));
    let pick = null;
    for(const p of opts){
      const lab = (p.label||'').toLowerCase();
      if(lab.includes('back') || lab.includes('rear') || lab.includes('environment') || lab.includes('trasera')){ pick = p.id; break; }
    }
    if(!pick && opts[0]) pick = opts[0].id;
    if(pick) currentDeviceId = pick;
  }catch(e){}

  // auto start scanning
  await startScanning();

  // If permissions already granted, try to refresh devices list on change
  navigator.permissions && navigator.permissions.query({name:'camera'}).then(p=>{
    p.onchange = () => populateDevices();
  }).catch(()=>{});
}

initAuto();
