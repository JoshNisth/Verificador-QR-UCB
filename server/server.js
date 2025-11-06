const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
// node-fetch used as fallback when Node doesn't provide global fetch (Node < 18)
let fetchFunc = global.fetch;
if(!fetchFunc){
  try{
    fetchFunc = require('node-fetch');
  }catch(e){
    console.error('node-fetch not available and global fetch missing. Please run `npm install` in server/');
  }
}

const fetch = fetchFunc;

const app = express();
app.use(cors());

function extractFieldsFromText(text){
  const res = {name:'', document:'', career:'', email:'', phone:'', period:''};

  if(!text || !text.trim()) return res;

  // normalize whitespace
  let norm = text.replace(/\s+/g,' ').trim();

  // remove known garbage tokens that appear concatenated in some renders
  norm = norm.replace(/fingerprint/ig, ' ');
  norm = norm.replace(/Documento\s+de\s+Identidad/ig, ' ');
  norm = norm.replace(/Documento[:]?/ig, ' ');
  norm = norm.replace(/\bCI\b[:]?/ig, ' ');
  norm = norm.replace(/\bschool\b/ig, ' ');
  norm = norm.replace(/eventFecha/ig, ' ');
  norm = norm.replace(/Fecha\s+de\s+Inic[a-z]*/ig, ' ');
  // remove common header tokens
  norm = norm.replace(/CARNET\s+UNIVERSITARIO/ig, ' ');
  norm = norm.replace(/UNIVERSIDAD\s+CAT[ÓO]LICA\s+BOLIVIANA/ig, ' ');
  norm = norm.replace(/\bUNIVERSIDAD\b/ig, ' ');
  norm = norm.replace(/\bCARN[ÉE]?\b/ig, ' ');
  // collapse spaces again
  norm = norm.replace(/\s+/g,' ').trim();

  // Extract email (lowercase)
  // First, try label-based extraction which matches the page structure reliably
  const labelName = norm.match(/Nombre\s+Completo[:]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,200})/i) || norm.match(/Nombre[:]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,200})/i);
  if(labelName) res.name = labelName[1].trim();

  const labelDoc = norm.match(/Documento\s+de\s+Identidad[:]?\s*([0-9]{6,12})/i) || norm.match(/Documento[:]?\s*([0-9]{6,12})/i);
  if(labelDoc) res.document = labelDoc[1].trim();

  const labelPhone = norm.match(/Celular[:]?\s*([0-9\+\-\s()]{6,20})/i) || norm.match(/Telefono[:]?\s*([0-9\+\-\s()]{6,20})/i);
  if(labelPhone){
    const raw = labelPhone[1];
    const ph = (raw.match(/\+/) ? '+' : '') + raw.replace(/[^0-9]/g,'');
    if(ph.length >= 7 && ph.length <= 15) res.phone = ph;
  }

  const labelEmail = norm.match(/Correo[:]?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if(labelEmail) res.email = labelEmail[1].trim().toLowerCase();

  const labelCareer = norm.match(/Carrera[:]?\s*([A-ZÁÉÍÓÚÑ\-\s]{3,80})/i);
  if(labelCareer) res.career = labelCareer[1].trim();

  const labelPeriod = norm.match(/Periodo(?:\s+Acad[eé]mico)?[:]?\s*([A-Z0-9\s]{3,80})/i);
  if(labelPeriod) res.period = labelPeriod[1].trim();

  // Clean career of trailing tokens that sometimes get concatenated (e.g. 'schoolPeriodo Académico')
  if(res.career){
    res.career = res.career.replace(/schoolPeriodo/ig, ' ')
                         .replace(/school/ig, ' ')
                         .replace(/Periodo\s+Acad[eé]mico/ig, ' ')
                         .replace(/Periodo/ig, ' ')
                         .replace(/Acad[eé]mico/ig, ' ')
                         .replace(/Academico/ig, ' ')
                         .replace(/\s+/g,' ').trim();
    // ensure we cut off any remaining trailing tokens like 'Académico' or 'Periodo'
    res.career = res.career.split(/\bPeriodo\b|\bAcad[eé]mico\b|\bAcademico\b|\bschool\b/ig)[0].trim();
  }
  // If label-based extraction succeeded for key fields, prefer them and skip some heuristics

  // Extract document (CI) - prefer 6-12 digits if not set by label
  if(!res.document){
    const docMatch = norm.match(/([0-9]{6,12})/);
    if(docMatch) res.document = docMatch[1].trim();
  }

  // If we have a document, try to extract the name immediately before it (common layout)
  if(res.document){
    try{
      const docIdx = norm.indexOf(res.document);
      if(docIdx > 0){
        const before = norm.slice(Math.max(0, docIdx - 160), docIdx);
        // look for the last uppercase name-like sequence before the document
        const nameNearMatch = before.match(/([A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+){1,6})\s*$/);
        if(nameNearMatch){
          const candidate = nameNearMatch[1].trim();
          if(!/\d/.test(candidate) && !/(SEMESTRE|INGENIER|LICENCIAT|MEDICIN|DERECHO|TECNOLOG|UNIVERSIDAD|CARNET|SCHOOL)/i.test(candidate) && candidate.length > 4){
            res.name = candidate;
          }
        }
      }
    }catch(e){/* ignore */}
  }

  // Extract period (e.g., SEGUNDO SEMESTRE 2025)
  const periodMatch = norm.match(/(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SEPTIMO|OCTAVO|NOVENO|DECIMO|[0-9]{1,2}º?)\s+SEMESTRE\s+[0-9]{4}/i) || norm.match(/Periodo(?:\s+Acad[eé]mico)?[:]?\s*([A-Z0-9\-\s]{2,60})/i) || norm.match(/([0-9]{4})/);
  if(periodMatch) res.period = periodMatch[0].trim();

  // Extract phone - require 7-15 digits and not equal to document (if not set by label)
  if(!res.phone){
    const phoneMatch = norm.match(/(\+?\d[\d\s\-()]{6,}\d)/);
    if(phoneMatch){
      const raw = phoneMatch[0];
      const ph = (raw.match(/\+/) ? '+' : '') + raw.replace(/[^\d]/g,'');
      if(!(res.document && ph === res.document)){
        if(ph.length >= 7 && ph.length <= 15) res.phone = ph;
      }
    }
  }

  // Extract career - common pattern if not set by label
  if(!res.career){
    const careerMatch = norm.match(/([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\-\s]{3,80}?(?:INGENIERIA|INGENIERÍA|TECNOLOGÍA|LICENCIATURA|DERECHO|MEDICINA|ADMINISTRACI[OÓ]N|SISTEMAS|COMPUTACI[oó]N|ECONOMIA|ECONOMÍA|ARQUITECTURA))/i) || norm.match(/Carrera[:]?\s*([A-ZÁÉÍÓÚÑ\-\s]{3,80})/i);
    if(careerMatch) res.career = careerMatch[1].trim();
  }

  // If name not set by label, try positional heuristic: look before document number
  if(!res.name){
    if(res.document){
      try{
        const docIdx = norm.indexOf(res.document);
        if(docIdx > 0){
          const before = norm.slice(Math.max(0, docIdx - 200), docIdx);
          const nameNearMatch = before.match(/([A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+){1,6})\s*$/);
          if(nameNearMatch){
            const candidate = nameNearMatch[1].trim();
            if(!/\d/.test(candidate) && !/(SEMESTRE|INGENIER|LICENCIAT|MEDICIN|DERECHO|TECNOLOG|UNIVERSIDAD|CARNET|SCHOOL)/i.test(candidate) && candidate.length > 4){
              res.name = candidate;
            }
          }
        }
      }catch(e){/* ignore */}
    }
  }

  // Fallbacks: if name empty, try to pick first capitalized phrase
  if(!res.name){
    const general = norm.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if(general) res.name = general[1].trim();
  }

  return res;
}

// Simple allowlist to avoid open proxy abuse. Set ALLOWED_HOSTS env var to comma-separated hostnames.
const DEFAULT_ALLOWED = ['academico.ucb.edu.bo'];
const allowedEnv = process.env.ALLOWED_HOSTS;
const ALLOWED = allowedEnv ? allowedEnv.split(',').map(s=>s.trim()).filter(Boolean) : DEFAULT_ALLOWED;

app.get('/fetch', async (req, res) => {
  const target = req.query.url;
  if(!target) return res.status(400).json({error:'missing url param'});

  let parsed;
  try{
    parsed = new URL(target);
  }catch(e){
    return res.status(400).json({error:'invalid url'});
  }

  if(!ALLOWED.includes(parsed.hostname)){
    return res.status(403).json({error:'host not allowed', host: parsed.hostname});
  }

  try{
    console.log(`[proxy] fetching ${parsed.href}`);
    const r = await fetch(parsed.href, {headers:{'User-Agent':'verificador-qr-proxy/1.0','Accept':'text/html'}});
    console.log(`[proxy] response status ${r.status} ${r.statusText}`);
    const html = await r.text();
    const $ = cheerio.load(html);
    const bodyText = $('body').text().replace(/\s+/g,' ').trim();
    const fields = extractFieldsFromText(bodyText);
    // debug info collector
    const debugInfo = { fetchedBodyLength: (bodyText && bodyText.length) || 0, triedHeadless: false, puppeteerInstalled: false, puppeteerError: null, renderedBodyTextLength: 0 };
    // If the server returned an HTML shell (no body text) the page may render content
    // client-side with JavaScript. In that case, try a headless browser render (Puppeteer)
    // to obtain the rendered DOM text and re-run extraction. This is heavier, so we
    // only attempt it when the fetched bodyText is empty or extremely small.
    if((!bodyText || bodyText.length < 50)){
      console.log('[proxy] body text empty/small - attempting headless render fallback');
      debugInfo.triedHeadless = true;
      try{
        let puppeteer;
        try{
          puppeteer = require('puppeteer');
        }catch(e){
          console.warn('[proxy] puppeteer not installed; skipping headless render fallback. To enable, run `npm install puppeteer` in server/');
          debugInfo.puppeteerInstalled = false;
          debugInfo.puppeteerError = (e && e.message) || String(e);
        }
        if(puppeteer){
          debugInfo.puppeteerInstalled = true;
          const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
          const page = await browser.newPage();
          await page.setUserAgent('verificador-qr-proxy/1.0 (headless)');
          // set reasonable timeout
          await page.goto(parsed.href, {waitUntil: 'networkidle2', timeout: 20000});
          // grab rendered content
          const renderedHtml = await page.content();
          const $$ = cheerio.load(renderedHtml);
          const renderedBodyText = $$('body').text().replace(/\s+/g,' ').trim();
          console.log(`[proxy] headless rendered body length=${renderedBodyText.length}`);
          debugInfo.renderedBodyTextLength = renderedBodyText.length;
          if(renderedBodyText && renderedBodyText.length > (bodyText ? bodyText.length : 0)){
            // re-run extraction on rendered text
            const renderedFields = extractFieldsFromText(renderedBodyText);
            // prefer rendered fields when they contain values
            Object.keys(renderedFields).forEach(k=>{
              if(renderedFields[k] && renderedFields[k].length > 0) fields[k] = renderedFields[k];
            });
          }
          // include rendered snippets in debug if requested
          if(req.query.debug === '1'){
            fields._debug = fields._debug || {};
            fields._debug.renderedHtmlSnippet = renderedHtml.slice(0,4000);
            fields._debug.renderedBodyTextSnippet = renderedBodyText.slice(0,4000);
            fields._debug.renderedBodyTextLength = renderedBodyText.length;
          }
          await browser.close();
        }
      }catch(pe){
        console.warn('[proxy] headless render failed', pe && pe.message ? pe.message : pe);
        debugInfo.puppeteerError = (pe && pe.message) ? pe.message : String(pe);
        // don't fail the whole request - we will just return whatever we have
      }
    }
    // Include optional metadata
    fields._meta = {fetchedFrom: parsed.href, status: r.status};
    // debug option: include html/text snippets to help tuning parser
    if(req.query.debug === '1'){
      fields._debug = Object.assign({
        htmlSnippet: html.slice(0, 4000),
        bodyTextSnippet: bodyText.slice(0, 4000),
        bodyTextLength: bodyText.length
      }, debugInfo || {});
    }
    return res.json(fields);
  }catch(err){
    console.error('[proxy] fetch error', err && err.message ? err.message : err);
    // return more debug info (safe for local testing)
    return res.status(500).json({error: String(err), note: 'proxy fetch failed. Check network/DNS or TLS.'});
  }
});

// health endpoint
app.get('/health', (req,res)=>{
  res.json({ok:true, time: new Date().toISOString(), allowedHosts: ALLOWED});
});

const port = process.env.PORT || 9000;
app.listen(port, ()=> console.log(`QR proxy listening on http://localhost:${port}`));
