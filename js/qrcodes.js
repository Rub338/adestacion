// ── QR Codes ─────────────────────────────────────────────────────────────────
function renderQRs() {
  const salaFiltro = document.getElementById('filtroSalaQR')?.value || '';
  const buscar = (document.getElementById('buscarQR')?.value || '').toLowerCase().trim();
  const lista = datosMaquinas.filter(m => {
    const salaMach = !salaFiltro || String(m.sala_id) === String(salaFiltro);
    const textMatch = !buscar || (m.nombre || '').toLowerCase().includes(buscar) || (m.sala_nombre || '').toLowerCase().includes(buscar);
    return salaMach && textMatch;
  });

  const grid = document.getElementById('gridQRs');
  if (isCargando && !datosMaquinas.length) {
    grid.innerHTML = skeletonMaquinas();
    return;
  }

  const subtitleEl = document.getElementById('subtitle-qrcodes');
  if (subtitleEl) {
    const salas = [...new Set(lista.map(m => m.sala_nombre).filter(Boolean))];
    subtitleEl.textContent = `${lista.length} código${lista.length !== 1 ? 's' : ''} QR · ${salas.length} sala${salas.length !== 1 ? 's' : ''}`;
  }

  const cardsHtml = lista.map(m => {
    const estado = calcularEstadoUnificado(m);
    const estOp = (m.estado || 'activa').toLowerCase().trim();
    const isActiva = estOp !== 'inactiva';
    const tieneIncidencia = estado.texto === 'SIN RESOLVER' || estado.texto === 'EN SEGUIMIENTO';

    const bgOp    = isActiva ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)';
    const colorOp = isActiva ? '#10b981' : '#4b5563';
    const textOp  = isActiva ? 'ACTIVA' : 'INACTIVA';

    const incBadge = tieneIncidencia
      ? `<span style="font-size:10px;font-weight:600;color:${estado.color};background:${estado.bg};border-radius:6px;padding:2px 7px;white-space:nowrap">${estado.texto}</span>`
      : '';

    return `
    <div class="maquina-card fade-in" style="cursor:pointer;display:flex;flex-direction:column;align-items:center" onclick="verQR('${m.id}', '${escapar(m.nombre)}', '${escapar(m.sala_nombre)}')">
      <div id="qr-prev-${m.id}" style="width:150px;height:150px;margin:10px auto 4px;flex-shrink:0"></div>
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:10px;letter-spacing:0.02em">Escanear · o clic para ampliar</div>
      <div style="width:100%;padding-top:10px;border-top:1px solid var(--border)">
        <div class="maquina-nombre">${m.nombre}</div>
        <div class="maquina-tipo">${m.sala_nombre} · ${m.tipo}</div>
        <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:10px;font-weight:600;color:${colorOp};background:${bgOp};border:1px solid ${colorOp}30;border-radius:6px;padding:2px 7px;white-space:nowrap">${textOp}</span>
          ${incBadge}
        </div>
      </div>
    </div>
    `;
  }).join('');

  grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px">${cardsHtml}</div>`;

  lista.forEach(m => {
    const container = document.getElementById(`qr-prev-${m.id}`);
    if (!container || typeof QRCode === 'undefined') return;
    const targetUrl = `${serverHost}/operario.html?maquinaId=${m.id}`;
    new QRCode(container, {
      text: targetUrl,
      width: 150,
      height: 150,
      colorDark: '#1a1a2e',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
      quietZone: 6
    });
  });
}

function filtrarQRs() { renderQRs(); }

async function verQR(id, nombre, sala) {
  document.getElementById('qrNombre').textContent = nombre;
  document.getElementById('qrSala').textContent = sala;
  const qrContainer = document.getElementById('qrImgContainer');
  qrContainer.innerHTML = '';
  qrContainer.style.cursor = 'pointer';

  const targetUrl = `${serverHost}/operario.html?maquinaId=${id}`;
  qrContainer.onclick = () => window.open(targetUrl, '_blank');

  document.getElementById('qrUrl').textContent = 'Generando...';
  abrirModal('modalQR');

  const qrUrlEl = document.getElementById('qrUrl');
  qrUrlEl.textContent = targetUrl;
  qrUrlEl.href = targetUrl;
  qrUrlEl.style.textDecoration = 'underline';

  new QRCode(qrContainer, {
    text: targetUrl,
    width: 320,
    height: 320,
    colorDark: "#1a1a2e",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.L,
    quietZone: 20
  });
}

function imprimirTodosLosQRs() {
  const salaFiltro = document.getElementById('filtroSalaQR').value;
  const lista = salaFiltro
    ? datosMaquinas.filter(m => String(m.sala_id) === String(salaFiltro))
    : datosMaquinas;

  if (!lista.length) return showFeedback('Sin máquinas', 'No hay máquinas seleccionadas para imprimir.', '');

  const printWindow = window.open('', '_blank');
  let baseOrigin = serverHost;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Códigos QR — Gestor de Máquinas</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
        .print-header { text-align: center; padding: 20px 20px 14px; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; }
        .print-header h1 { font-size: 18px; font-weight: 700; color: #1a1a2e; }
        .print-header p { font-size: 11px; color: #6b7280; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 0 16px 20px; }
        .qr-label { border: 1.5px solid #d1d5db; padding: 14px 12px 10px; border-radius: 10px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
        .qr-canvas { display: flex; justify-content: center; margin-bottom: 8px; }
        .qr-canvas img, .qr-canvas canvas { max-width: 100% !important; height: auto !important; display: block; }
        .qr-name { font-weight: 700; font-size: 13px; color: #1a1a2e; margin-bottom: 2px; }
        .qr-sala { font-size: 10px; color: #6b7280; }
        .qr-url { font-size: 7.5px; color: #9ca3af; word-break: break-all; margin-top: 6px; line-height: 1.4; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-header { margin-bottom: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Gestor de Máquinas — Códigos QR</h1>
        <p>${lista.length} máquina${lista.length !== 1 ? 's' : ''} · Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="grid">
      ${lista.map(m => `
        <div class="qr-label">
          <div class="qr-canvas" id="canvas-${m.id}"></div>
          <div class="qr-name">${m.nombre}</div>
          <div class="qr-sala">${m.sala_nombre || '—'}</div>
        </div>
      `).join('')}
      </div>
      <script>
        window.onload = () => {
          const maquinas = ${JSON.stringify(lista)};
          maquinas.forEach(m => {
            new QRCode(document.getElementById('canvas-' + m.id), {
              text: "${baseOrigin}/operario.html?maquinaId=" + m.id,
              width: 180,
              height: 180,
              correctLevel: QRCode.CorrectLevel.M,
              quietZone: 8
            });
          });
          setTimeout(() => { window.print(); window.close(); }, 1200);
        };
      </script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

function imprimirQR() {
  const nombre = document.getElementById('qrNombre').textContent;
  const sala = document.getElementById('qrSala').textContent;
  const container = document.getElementById('qrImgContainer');
  const imgElement = container.querySelector('img');
  const img = imgElement ? imgElement.src : '';

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>QR - ${nombre}</title>
    <style>body{font-family:sans-serif;text-align:center;padding:40px}
    h2{margin-bottom:4px}p{color:#666;font-size:14px;margin-bottom:20px}
    img{border:3px solid #000;border-radius:8px;width:280px}
    </style></head><body>
    <h2>${nombre}</h2><p>${sala}</p>
    <img src="${img}">
    <script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script>
    </body></html>`);
  w.document.close();
}
