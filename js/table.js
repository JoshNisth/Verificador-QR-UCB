// Módulo para manejar la tabla de resultados y exportar a CSV
const rows = [];

export function initTable(tableEl){
  // clean
  const tbody = tableEl.querySelector('tbody');
  tbody.innerHTML = '';
}

// fields can be string (legacy) or object {name, document, career, url, text}
export function addRow(tableEl, fields){
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();
  const idx = rows.length + 1;
  let rowObj = {idx, date, time};
  if(typeof fields === 'string'){
    rowObj.text = fields;
  }else{
    rowObj = Object.assign(rowObj, fields);
  }
  rows.push(rowObj);

  const tbody = tableEl.querySelector('tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${idx}</td>
    <td>${escapeHtml(rowObj.date || date)}</td>
    <td>${escapeHtml(rowObj.time || time)}</td>
    <td>${escapeHtml(rowObj.name || rowObj.text || '')}</td>
    <td>${escapeHtml(rowObj.document || '')}</td>
    <td>${escapeHtml(rowObj.career || '')}</td>
    <td>${escapeHtml(rowObj.email || '')}</td>
    <td>${escapeHtml(rowObj.phone || '')}</td>
    <td>${escapeHtml(rowObj.period || '')}</td>
  `;
  tbody.prepend(tr);
}

export function clear(tableEl){
  rows.length = 0;
  const tbody = tableEl.querySelector('tbody');
  tbody.innerHTML = '';
}

function formatDateForFilename(d = new Date()){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function exportCSV(filename){
  if(rows.length === 0) return null;
  // default filename: Lista (fecha de hoy)
  if(!filename) filename = `Lista (${formatDateForFilename()}).csv`;

  // Use semicolon as separator so Excel in many locales opens columns correctly
  const sep = ';';
  const header = ['#','Fecha','Hora','Nombre','Documento','Carrera','Correo','Celular','Periodo inscrito'];
  const lines = [header.join(sep)];
  for(const r of rows){
    const safeName = (r.name||r.text||'').replace(/"/g,'""');
    const safeDoc = (r.document||'').replace(/"/g,'""');
    const safeCareer = (r.career||'').replace(/"/g,'""');
    const safeEmail = (r.email||'').replace(/"/g,'""');
    const safePhone = (r.phone||'').replace(/"/g,'""');
    const safePeriod = (r.period||'').replace(/"/g,'""');
    // Quote every field to be safe and join with separator
    const row = [r.idx, r.date || '', r.time || '', safeName, safeDoc, safeCareer, safeEmail, safePhone, safePeriod]
      .map(v => `"${String(v||'')}"`).join(sep);
    lines.push(row);
  }
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM for Excel + CRLF
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1000);
  return true;
}

function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}

function escapeAttr(s){
  return String(s||'').replace(/"/g,'&quot;');
}
