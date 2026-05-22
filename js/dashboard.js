// ── Dashboard ─────────────────────────────────────────────────────────────────
async function cargarDashboard() {
  if (!datosHistorial.length) return;
  actualizarVistaDashboard();
}

function actualizarVistaDashboard() {
  const historial = datosHistorial;

  const sinResolver = historial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && !r.en_seguimiento).length;
  const incidenciasEnSeguimiento = historial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && r.en_seguimiento).length;
  const kpiSinResolver = document.getElementById('kpi-sin-resolver');
  if (kpiSinResolver) kpiSinResolver.textContent = sinResolver;
  const kpiSeg = document.getElementById('kpi-en-seguimiento-dash');
  if (kpiSeg) kpiSeg.textContent = incidenciasEnSeguimiento;

  const totalActivas   = datosMaquinas.filter(m => (m.estado || 'activa').toLowerCase().trim() !== 'inactiva').length;
  const totalInactivas = datosMaquinas.filter(m => (m.estado || 'activa').toLowerCase().trim() === 'inactiva').length;

  const kpiMaqAct = document.getElementById('kpi-maq-activas');
  if (kpiMaqAct) kpiMaqAct.textContent = totalActivas;
  const kpiMaqInact = document.getElementById('kpi-maq-inactivas');
  if (kpiMaqInact) kpiMaqInact.textContent = totalInactivas;
  
  const maqInactivasEl = document.getElementById('dashboardMaqInactivas');
  if (maqInactivasEl) {
    const maqConProblemas = datosMaquinas.filter(m => {
      return (m.estado || 'activa').toLowerCase().trim() === 'inactiva';
    });
    
    maqInactivasEl.innerHTML = maqConProblemas.length
      ? maqConProblemas.map(m => {
          const estado = calcularEstadoUnificado(m);
          const tieneIncidencia = estado.texto === 'SIN RESOLVER' || estado.texto === 'EN SEGUIMIENTO';
          return `
          <div class="dashboard-maq-inactiva" onclick="navigateTo('maquinas', '${m.id}')" style="cursor:pointer;padding:5px 10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;font-size:11px;transition:all 0.2s ease;display:flex;align-items:center;justify-content:space-between;gap:8px" title="${m.nombre} · ${m.sala_nombre}">
            <span style="color:var(--text-primary);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.nombre} · ${m.sala_nombre}</span>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <span style="font-size:9px;font-weight:700;color:#4b5563;background:rgba(107,114,128,0.1);border:1px solid rgba(107,114,128,0.3);border-radius:4px;padding:1px 5px">INACTIVA</span>
              ${tieneIncidencia ? `<span style="font-size:9px;font-weight:700;color:${estado.color};background:${estado.bg};border:1px solid ${estado.color}30;border-radius:4px;padding:1px 5px">${estado.texto}</span>` : ''}
            </div>
          </div>`;
        }).join('')
      : `<div style="font-size:11px;color:var(--success);text-align:center;padding:4px">Todas activas</div>`;
  }

  const incPendientes = historial.filter(r => r.tipo === 'Incidencia' && !r.resuelta);
  renderIncPendientesDashboard(incPendientes.slice(0, 5));

  actualizarSubtitulosSecciones();
}

function actualizarSubtitulosSecciones() {
  const elMaq = document.getElementById('subtitle-maquinas');
  if (elMaq) {
    const totalMaq = datosMaquinas.length;
    const totalSalas = datosSalas.length;
    const activas   = datosMaquinas.filter(m => (m.estado || 'activa').toLowerCase().trim() !== 'inactiva').length;
    const inactivas = totalMaq - activas;
    const partes = [
      `${totalMaq} máquina${totalMaq !== 1 ? 's' : ''}`,
      `${totalSalas} sala${totalSalas !== 1 ? 's' : ''}`,
      `${activas} activa${activas !== 1 ? 's' : ''}`,
    ];
    if (inactivas > 0) partes.push(`${inactivas} inactiva${inactivas !== 1 ? 's' : ''}`);
    elMaq.textContent = partes.join(' · ');
  }

  const elInc = document.getElementById('subtitle-incidencias');
  if (elInc) {
    const incidencias = datosHistorial.filter(r => r.tipo === 'Incidencia');
    const sinResolver = incidencias.filter(r => !r.resuelta && !r.en_seguimiento).length;
    const enSeg = incidencias.filter(r => !r.resuelta && r.en_seguimiento).length;
    const resueltas = incidencias.filter(r => r.resuelta).length;
    const partes = [];
    if (sinResolver > 0) partes.push(`${sinResolver} sin resolver`);
    if (enSeg > 0) partes.push(`${enSeg} en seguimiento`);
    partes.push(`${resueltas} resuelta${resueltas !== 1 ? 's' : ''}`);
    elInc.textContent = partes.join(' · ');
  }

  const elUsr = document.getElementById('subtitle-usuarios');
  if (elUsr) {
    const total = datosUsuarios.length;
    const admins = datosUsuarios.filter(u => u.rol === 'admin').length;
    const tecnicos = datosUsuarios.filter(u => u.rol === 'tecnico').length;
    const pendientes = datosUsuarios.filter(u => u.activo === false).length;
    const partes = [`${total} usuario${total !== 1 ? 's' : ''}`];
    if (admins > 0) partes.push(`${admins} admin${admins !== 1 ? 's' : ''}`);
    if (tecnicos > 0) partes.push(`${tecnicos} técnico${tecnicos !== 1 ? 's' : ''}`);
    if (pendientes > 0) partes.push(`${pendientes} pendiente${pendientes !== 1 ? 's' : ''} de alta`);
    elUsr.textContent = partes.join(' · ');
  }
}

function renderIncPendientesDashboard(lista) {
  const tbody = document.getElementById('dashboardIncPendientes');
  const empty = document.getElementById('dashboardIncEmpty');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = lista.map(r => `
    <tr onclick="verDetalleSesion('${r.id}')" style="cursor:pointer">
      <td><span style="font-weight:600;color:var(--danger)">${r.maquina}</span></td>
      <td><span class="text-muted">${r.sala}</span></td>
      <td>${r.operario}</td>
      <td>${formatFechaHora(r.completado_en)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();verDetalleSesion('${r.id}')">Gestionar</button></td>
    </tr>
  `).join('');
}

function renderBarChart(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container || !items.length) {
    container.innerHTML = '<div class="empty-state" style="padding:24px"><div class="icon"></div><p>Sin datos aún</p></div>';
    return;
  }
  const max = Math.max(...items.map(i => i.value), 1);
  container.innerHTML = items.map(i => `
    <div class="chart-bar-row">
      <div class="chart-bar-label" title="${i.label}">${truncate(i.label, 12)}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(i.value / max * 100).toFixed(1)}%"></div>
      </div>
      <div class="chart-bar-val">${i.value}</div>
    </div>
  `).join('');
}
