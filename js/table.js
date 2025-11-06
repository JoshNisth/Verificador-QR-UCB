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
  const ts = now.toLocaleString();
  const idx = rows.length + 1;
  let rowObj = {idx, ts};
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
    <td>${ts}</td>
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

export function exportCSV(filename = 'verificador_qr.csv'){
  if(rows.length === 0) return null;
  const header = ['#','Hora','Nombre','Documento','Carrera','Correo','Celular','Periodo inscrito'];
  const lines = [header.join(',')];
  for(const r of rows){
    const safeName = (r.name||r.text||'').replace(/"/g,'""');
    const safeDoc = (r.document||'').replace(/"/g,'""');
    const safeCareer = (r.career||'').replace(/"/g,'""');
    const safeEmail = (r.email||'').replace(/"/g,'""');
    const safePhone = (r.phone||'').replace(/"/g,'""');
  const safePeriod = (r.period||'').replace(/"/g,'""');
  lines.push(`${r.idx},"${r.ts}","${safeName}","${safeDoc}","${safeCareer}","${safeEmail}","${safePhone}","${safePeriod}"`);
  }
  const csv = '\uFEFF' + lines.join('\n'); // BOM for Excel
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
