// ── Utilidades ───────────────────────────────────────────────────────────────
function calcularEstadoUnificado(maquina) {
  const estadoOperativo = (maquina.estado || 'activa').toLowerCase().trim();
  const tieneIncidencia = maquina.tiene_incidencia || false;
  const enSeguimiento = maquina.incidencia_en_seguimiento || false;

  if (tieneIncidencia && enSeguimiento) {
    return {
      texto: 'EN SEGUIMIENTO',
      clase: 'naranja',
      color: 'var(--warning)',
      bg: 'rgba(245, 158, 11, 0.1)',
      descripcion: 'Con incidencia en seguimiento'
    };
  }

  if (tieneIncidencia) {
    return {
      texto: 'SIN RESOLVER',
      clase: 'rojo',
      color: 'var(--danger)',
      bg: 'rgba(239, 68, 68, 0.1)',
      descripcion: 'Incidencia sin resolver'
    };
  }

  if (estadoOperativo === 'inactiva') {
    return {
      texto: 'INACTIVA',
      clase: 'gris',
      color: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.1)',
      descripcion: 'Fuera de servicio'
    };
  }

  return {
    texto: 'ACTIVA',
    clase: 'ok',
    color: 'var(--ok)',
    bg: 'rgba(16, 185, 129, 0.1)',
    descripcion: 'Funcionando correctamente'
  };
}

function formatFechaHora(str) { 
  if (!str) return '–'; 
  const d = new Date(str); 
  return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); 
}

function formatFechaDia(str) { 
  if (!str) return '–'; 
  const [y, m, d] = str.split('-'); 
  return `${d}/${m}`; 
}

function truncate(str, len) { 
  return str.length > len ? str.slice(0, len) + '…' : str; 
}

function escapar(str) { 
  return String(str).replace(/'/g, "\\'"); 
}

function skeletonMaquinas() {
  const card = `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;animation:pulse 1.5s ease-in-out infinite">
    <div style="height:14px;background:var(--bg-secondary);border-radius:6px;width:60%;margin-bottom:12px"></div>
    <div style="height:10px;background:var(--bg-secondary);border-radius:6px;width:40%;margin-bottom:20px"></div>
    <div style="height:10px;background:var(--bg-secondary);border-radius:6px;width:80%;margin-bottom:8px"></div>
    <div style="height:10px;background:var(--bg-secondary);border-radius:6px;width:70%"></div>
  </div>`;
  const inner = Array(6).fill(card).join('');
  return `<div class="grid-maquinas-inner" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;display:grid">${inner}</div>`;
}

function skeletonTabla(cols = 5) {
  const row = `<tr>
    ${Array(cols).fill(`<td><div style="height:12px;background:var(--bg-secondary);border-radius:6px;width:80%;animation:pulse 1.5s ease-in-out infinite"></div></td>`).join('')}
  </tr>`;
  return Array(5).fill(row).join('');
}

function customConfirm(titulo, msg, icon = '') {
  return new Promise((resolve) => {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmIcon').textContent = icon;
    abrirModal('modalConfirm');

    window.confirmResolve = () => {
      cerrarModal('modalConfirm');
      resolve(true);
    };
    window.confirmReject = () => {
      cerrarModal('modalConfirm');
      resolve(false);
    };
  });
}

function customPrompt(titulo, label, defaultValue = '') {
  return new Promise((resolve) => {
    document.getElementById('promptTitle').textContent = titulo;
    document.getElementById('promptLabel').textContent = label;
    const input = document.getElementById('promptInput');
    input.value = defaultValue;

    abrirModal('modalPrompt');
    setTimeout(() => input.focus(), 100);

    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.promptResolve();
      } else if (e.key === 'Escape') {
        window.promptReject();
      }
    };
    input.addEventListener('keydown', onKey);

    window.promptResolve = () => {
      input.removeEventListener('keydown', onKey);
      const val = input.value.trim();
      cerrarModal('modalPrompt');
      resolve(val);
    };

    window.promptReject = () => {
      input.removeEventListener('keydown', onKey);
      cerrarModal('modalPrompt');
      resolve(null);
    };
  });
}

function showFeedback(titulo, msg, icon = '') {
  document.getElementById('feedbackTitle').textContent = titulo;
  document.getElementById('feedbackMsg').textContent = msg;
  document.getElementById('feedbackIcon').textContent = icon;
  abrirModal('modalFeedback');
}
