// ── Incidencias ─────────────────────────────────────────────────────────────
let filtroIncActual = 'todas';
let ordenIncActual = 'fecha-desc';
let incidenciasVisibles = [];

async function cambiarOrdenInc(orden) {
  ordenIncActual = orden;
  await renderIncidencias(filtroIncActual);
}

async function toggleSeguimiento() {
  await renderIncidencias('seguimiento');
}

async function renderIncidencias(filtro = 'todas') {
  filtroIncActual = filtro;
  const grid = document.getElementById('gridTicketsIncidencias');
  const empty = document.getElementById('incidenciasEmpty');
  if (!grid) return;

  const filtroLabelEl = document.getElementById('filtro-incidencias-label');
  if (filtroLabelEl) {
    const nombresFiltro = { 'todas': 'Abiertas', 'pendientes': 'Sin resolver', 'seguimiento': 'En seguimiento', 'resueltas': 'Resueltas' };
    filtroLabelEl.textContent = 'Filtrado por: ' + nombresFiltro[filtro];
  }

  const botones = [
    { id: 'btn-inc-todas', color: 'var(--accent)' },
    { id: 'btn-inc-pendientes', color: 'var(--danger)' },
    { id: 'btn-inc-seguimiento', color: 'var(--warning)' },
    { id: 'btn-inc-resueltas', color: 'var(--success)' },
  ];
  const filtroMap = { 'todas': 'btn-inc-todas', 'pendientes': 'btn-inc-pendientes', 'seguimiento': 'btn-inc-seguimiento', 'resueltas': 'btn-inc-resueltas' };
  botones.forEach(({ id, color }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const activo = filtroMap[filtro] === id;
    btn.classList.toggle('active', activo);
    if (activo) {
      btn.style.background = color;
      btn.style.color = '#fff';
      btn.style.borderColor = color;
      btn.style.opacity = '1';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = color;
      btn.style.color = color;
      btn.style.opacity = id === 'btn-inc-resueltas' ? '0.85' : '1';
    }
  });

  let lista = datosHistorial.filter(r => r.tipo === 'Incidencia');

  const totalPendientes = lista.filter(r => !r.resuelta && !r.en_seguimiento).length;
  const totalResueltas  = lista.filter(r => r.resuelta).length;
  const totalSeguimiento = lista.filter(r => !r.resuelta && r.en_seguimiento).length;

  if (document.getElementById('kpi-inc-pendientes')) document.getElementById('kpi-inc-pendientes').textContent = totalPendientes;
  if (document.getElementById('kpi-inc-resueltas'))  document.getElementById('kpi-inc-resueltas').textContent  = totalResueltas;
  if (document.getElementById('kpi-inc-seguimiento')) document.getElementById('kpi-inc-seguimiento').textContent = totalSeguimiento;

  const cardPendientes = document.getElementById('kpi-inc-pendientes-card');
  const cardSeguimiento = document.getElementById('kpi-inc-seguimiento-card');
  const cardResueltas = document.getElementById('kpi-inc-resueltas-card');
  function mostrarCard(el, mostrar) {
    if (!el) return;
    if (mostrar) {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'scale(0.92)';
      el.style.pointerEvents = 'none';
    }
  }
  if (filtro === 'todas') {
    mostrarCard(cardPendientes, true);
    mostrarCard(cardSeguimiento, true);
    mostrarCard(cardResueltas, false);
  } else if (filtro === 'pendientes') {
    mostrarCard(cardPendientes, true);
    mostrarCard(cardSeguimiento, false);
    mostrarCard(cardResueltas, false);
  } else if (filtro === 'seguimiento') {
    mostrarCard(cardPendientes, false);
    mostrarCard(cardSeguimiento, true);
    mostrarCard(cardResueltas, false);
  } else if (filtro === 'resueltas') {
    mostrarCard(cardPendientes, false);
    mostrarCard(cardSeguimiento, false);
    mostrarCard(cardResueltas, true);
  }

  if (filtro === 'resueltas') {
    lista = lista.filter(r => r.resuelta);
  } else if (filtro === 'pendientes') {
    lista = lista.filter(r => !r.resuelta && !r.en_seguimiento);
  } else if (filtro === 'seguimiento') {
    lista = lista.filter(r => !r.resuelta && r.en_seguimiento);
  } else {
    lista = lista.filter(r => !r.resuelta);
  }

  const desde = document.getElementById('filtroIncDesde')?.value;
  const hasta = document.getElementById('filtroIncHasta')?.value;
  if (desde) {
    lista = lista.filter(r => new Date(r.completado_en || r.iniciado_en) >= new Date(desde));
  }
  if (hasta) {
    lista = lista.filter(r => new Date(r.completado_en || r.iniciado_en) <= new Date(hasta + 'T23:59:59'));
  }

  incidenciasVisibles = lista;

  const incSeguimiento = lista.filter(r => !r.resuelta && r.en_seguimiento);
  const idsSinCache = incSeguimiento.filter(r => !cacheSeguimientosNotas || !(r.id in cacheSeguimientosNotas));
  const seguimientosPromise = (idsSinCache.length > 0 && window.supabaseClient)
    ? window.supabaseClient
        .from('seguimientos')
        .select('incidencia_id, nota, timestamp')
        .in('incidencia_id', idsSinCache.map(r => r.id))
        .order('timestamp', { ascending: false })
        .then(({ data: seguimientos }) => {
          if (seguimientos) {
            if (!cacheSeguimientosNotas) cacheSeguimientosNotas = {};
            seguimientos.forEach(s => {
              cacheSeguimientosNotas[s.incidencia_id] = s.nota;
              const el = document.getElementById('seguimiento-nota-' + s.incidencia_id);
              if (el) el.textContent = truncate(s.nota, 100);
            });
          }
        }).catch(() => {})
    : Promise.resolve();

  const ordenSelect = document.getElementById('select-inc-orden');
  if (ordenSelect) ordenSelect.value = ordenIncActual;
  if (ordenIncActual === 'fecha-desc') {
    lista.sort((a, b) => new Date(b.completado_en) - new Date(a.completado_en));
  } else if (ordenIncActual === 'fecha-asc') {
    lista.sort((a, b) => new Date(a.completado_en) - new Date(b.completado_en));
  } else if (ordenIncActual === 'maquina') {
    lista.sort((a, b) => (a.maquina || '').localeCompare(b.maquina || ''));
  }

  if (!lista.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = lista.map(r => {
    const resuelta = r.resuelta || false;
    const esSeguimiento = !resuelta && r.en_seguimiento;

    const incColor    = resuelta ? 'var(--ok)' : (esSeguimiento ? 'var(--warning)' : 'var(--danger)');
    const incBg       = resuelta ? 'rgba(16,185,129,0.1)' : (esSeguimiento ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)');
    const incText     = resuelta ? 'RESUELTA' : (esSeguimiento ? 'EN SEGUIMIENTO' : 'SIN RESOLVER');
    const borderColor = resuelta ? 'var(--ok)' : (esSeguimiento ? 'var(--warning)' : 'var(--danger)');

    const maq = datosMaquinas.find(m =>
      String(m.id) === String(r.maquina_id) ||
      (r.maquina && m.nombre.trim().toLowerCase() === r.maquina.trim().toLowerCase())
    );
    const maquinaEstado = (maq ? maq.estado : 'activa').toLowerCase();
    const isActiva  = maquinaEstado !== 'inactiva';
    const bgOp      = isActiva ? 'rgba(16,185,129,0.12)' : 'rgba(75,85,99,0.14)';
    const colorOp   = isActiva ? '#10b981' : '#374151';
    const textOp    = isActiva ? 'ACTIVA' : 'INACTIVA';
    const mostrarMaquina = !resuelta;

    const seguimientoHtml = esSeguimiento ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);font-size:12px;color:var(--text-muted)">
        <b>Última actualización:</b> ${cacheSeguimientosNotas && r.id in cacheSeguimientosNotas ? truncate(cacheSeguimientosNotas[r.id], 100) : 'En seguimiento — sin notas aún'}
      </div>
    ` : '';

    return `
      <div class="ticket-card fade-in" onclick="verDetalleSesion('${r.id}')"
           style="cursor:pointer;border-left:4px solid ${borderColor};border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:var(--bg-card)">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px 10px">
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:2px">${r.maquina}</div>
            <div style="font-size:11px;color:var(--text-muted)">Máquina: ${maq?.tipo || r.sala || 'sin tipo'}</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();verDetalleSesion('${r.id}')" style="font-size:12px;padding:5px 12px;flex-shrink:0;margin-left:8px">Gestionar</button>
        </div>
        <!-- Body -->
        <div style="padding:8px 16px 12px;border-top:1px solid var(--border)">
          <div style="font-size:12px;color:var(--accent);margin-bottom:5px">${r.sala}</div>
          <div style="font-size:13px;color:var(--text-primary);margin-bottom:4px"><strong>Incidencia:</strong> ${truncate(r.observaciones || 'Sin descripción', 100)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Reportado: ${formatFechaHora(r.completado_en)} · por ${r.operario} (${formatearRol(r.rol)})</div>
          ${seguimientoHtml}
        </div>
        <!-- Footer -->
        <div style="display:flex;align-items:stretch;border-top:1px solid var(--border);margin-top:auto">
          ${mostrarMaquina ? `
          <div style="flex:1;padding:10px 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
            <div style="font-size:9px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Máquina</div>
            <span style="background:${bgOp};color:${colorOp};border:1.5px solid ${colorOp};border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:0.04em">${textOp}</span>
          </div>
          <div style="width:2px;background:${borderColor};margin:8px 0;flex-shrink:0"></div>
          ` : ''}
          <div style="flex:1;padding:10px 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
            <div style="font-size:9px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Estado incidencia</div>
            <span style="font-size:12px;font-weight:700;color:${incColor};background:${incBg};border:1.5px solid ${incColor}40;border-radius:20px;padding:4px 14px">${incText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  seguimientosPromise;
}

async function toggleResolucionIncidencia(id, nuevoEstado) {
  let comentario = '';
  if (nuevoEstado) {
    comentario = await customPrompt('Marcar como resuelta', 'Escribe un breve comentario sobre la solución (opcional):');
    if (comentario === null) return;
  }

  const res = await apiFetch(`/api/sesion/${id}/resolver`, {
    method: 'PUT',
    body: {
      resuelta: nuevoEstado,
      comentario_resolucion: comentario
    }
  });

  if (res.ok) {
    cerrarModal('modalDetalle');
    showFeedback(
      nuevoEstado ? 'Incidencia resuelta' : 'Incidencia reabierta',
      nuevoEstado ? 'La incidencia ha sido marcada como resuelta correctamente.' : 'La incidencia ha sido reabierta.',
      ''
    );
    await cargarDatosBase();
    if (document.getElementById('section-incidencias').classList.contains('active')) {
      const filtroActual = document.querySelector('.btn-outline.btn-sm.active[id^="btn-inc-"]')?.id.replace('btn-inc-', '') || 'todas';
      await renderIncidencias(filtroActual);
    }
  } else {
    showFeedback('Error de estado', 'No se pudo actualizar el estado de la incidencia: ' + res.error, '');
  }
}

function finalizarIncidenciaDesdeModal() {
  const id = window.currentIncidenciaId;
  if (!id) return;
  toggleResolucionIncidencia(id, true);
}

async function verDetalleSesion(id) {
  cerrarModal('modalHistorialMaquina');
  const container = document.getElementById('detalleContenido');
  const titleEl = document.querySelector('#modalDetalle .modal-title');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px;text-align:center"><span class="spinner"></span> Cargando...</div>';
  abrirModal('modalDetalle');

  const res = await apiFetch(`/api/sesion/${id}/detalle`);
  if (!res.ok) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${res.error}</div>`;
    return;
  }

  const { sesion } = res.data;
  window.currentIncidenciaId = id;
  const isInc = sesion.tipo === 'Incidencia';
  const resuelta = sesion.resuelta || false;

  if (titleEl) titleEl.textContent = 'Detalles de la Incidencia';

  container.innerHTML = `
    <div class="detail-container">
      <div class="detail-header-info" style="border-bottom: 2px solid var(--danger); margin-bottom: 20px;">
        <div class="detail-machine">
          <div>
            <div class="machine-name">${sesion.maquina}</div>
            <div class="machine-sala">${sesion.sala}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="estado-badge vencido">Incidencia</div>
          <div class="estado-badge ${resuelta ? 'ok' : 'vencido'}">${resuelta ? 'Resuelta' : 'Sin resolver'}</div>
          ${rolActual === 'admin' ? `<button class="btn btn-icon" style="background:transparent;border:none;color:var(--danger);padding:4px;font-size:16px;cursor:pointer;" onclick="eliminarIncidencia('${sesion.id}')" title="Eliminar registro">Eliminar</button>` : ''}
        </div>
      </div>

      <div class="detail-layout-grid">
        <div>
          <div class="detail-stats-grid" style="margin-bottom: 16px;">
            <div class="detail-stat"><div class="label">${sesion.rol === 'usuario' ? 'Reportado por' : formatearRol(sesion.rol)}</div><div class="value">${sesion.operario}<span style="font-size:11px;color:var(--text-muted);margin-left:6px">(${formatearRol(sesion.rol)})</span></div></div>
            <div class="detail-stat"><div class="label">Fecha</div><div class="value">${formatFechaHora(sesion.completado_en)}</div></div>
          </div>
          
          <div class="detail-section" style="margin-bottom: 16px;">
            <div class="section-label">Descripción</div>
            <div class="detail-notes" style="font-size:13px; ${isInc ? 'background:rgba(239, 68, 68, 0.05); border-left:4px solid var(--danger)' : ''}">${sesion.observaciones || 'Sin notas'}</div>
          </div>

          ${sesion.comentario_resolucion ? `
            <div class="detail-section" style="margin-bottom: 16px;">
              <div class="section-label">Solución / Resolución</div>
              <div class="detail-notes" style="font-size:13px; background:rgba(16, 185, 129, 0.05); border-left:4px solid var(--success); color:var(--success); font-weight:600">${sesion.comentario_resolucion}</div>
            </div>
          ` : ''}

          ${isInc && !resuelta ? `
            <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="editarDescripcionIncidencia('${sesion.id}')">Editar descripción</button>
          ` : ''}
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${sesion.fotos && sesion.fotos.length > 0 ? `
            <div>
              <div class="section-label" style="margin-bottom: 8px">Evidencias (${sesion.fotos.length})</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${sesion.fotos.map(f => `<img src="${f}" onclick="abrirLightbox('${f}')" style="width:100%; height: 80px; object-fit: cover; border-radius:8px; cursor:zoom-in; border:1px solid var(--border); transition:transform .15s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" loading="lazy">`).join('')}
              </div>
            </div>
          ` : `
            <div style="text-align:center; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border)">
              <div style="font-size:24px; opacity: 0.3; margin-bottom: 4px"></div>
              <div style="font-size:11px; color: var(--text-muted)">Sin fotos adjuntas</div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  const seccionSeg = document.getElementById('seccionSeguimiento');
  const timeline = document.getElementById('seguimientoTimeline');

  if (isInc && seccionSeg && timeline) {
    seccionSeg.style.display = 'block';
    timeline.innerHTML = '<div style="text-align:center;padding:10px;opacity:0.5">Cargando hilo de seguimiento...</div>';

    window.currentIncidenciaId = id;

    const segRes = await apiFetch(`/api/incidencia/${id}/seguimientos`);
    if (segRes.ok && segRes.data) {
      const notas = segRes.data;
      if (notas.length === 0) {
        timeline.innerHTML = '<div style="text-align:center;padding:10px;opacity:0.5;font-size:12px">No hay notas registradas aún.</div>';
      } else {
        timeline.classList.add('timeline-compact');
        timeline.innerHTML = notas.map((n, index) => {
          const fechaCreado = formatFechaHora(n.timestamp);
          const esPrimera = index === notas.length - 1;
          const nombreAutor = n.perfiles?.nombre || 'Técnico';
          const rolAutor = n.perfiles?.rol || '';
          
          return `
          <div class="timeline-item" id="seg-item-${n.id}">
            <div class="timeline-meta" style="display:flex;justify-content:space-between;align-items:center">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <b>${nombreAutor}</b>
                ${rolAutor ? `<span style="font-size:11px;color:var(--text-muted)">(${formatearRol(rolAutor)})</span>` : ''}
                <span style="font-size:11px;color:var(--text-muted)">${fechaCreado}</span>
              </div>
              ${esPrimera ? `<button onclick="iniciarEdicionSeguimiento('${n.id}', '${encodeURIComponent(n.nota)}')" style="background:transparent;border:none;color:var(--accent);cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px" title="Editar nota">Editar</button>` : ''}
            </div>
            <div class="timeline-content">
              <div class="timeline-text" id="seg-text-${n.id}">${n.nota}</div>
              <div id="seg-edit-${n.id}" style="display:none;margin-top:8px">
                <textarea id="seg-input-${n.id}" class="form-control" rows="2" style="font-size:13px;margin-bottom:8px">${n.nota}</textarea>
                <div style="display:flex;gap:8px">
                  <button onclick="guardarEdicionSeguimiento('${n.id}')" style="padding:4px 12px;background:var(--accent);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer">Guardar</button>
                  <button onclick="cancelarEdicionSeguimiento('${n.id}')" style="padding:4px 12px;background:var(--bg-secondary);color:var(--text-muted);border:none;border-radius:6px;font-size:12px;cursor:pointer">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        `}).join('');
        timeline.scrollTop = timeline.scrollHeight;
      }
    } else {
      timeline.innerHTML = '<div style="color:var(--danger);font-size:12px">Error al cargar el historial de seguimiento.</div>';
    }
  } else if (seccionSeg) {
    seccionSeg.style.display = 'none';
  }

  const btnFinalizar = document.getElementById('btnFinalizarIncidencia');
  if (btnFinalizar) {
    btnFinalizar.style.display = (isInc && !resuelta) ? 'inline-flex' : 'none';
  }
}

async function guardarNuevaNota() {
  const input = document.getElementById('nuevaNotaSeguimiento');
  const btn = document.getElementById('btnGuardarNota');
  const nota = input.value.trim();
  const id = window.currentIncidenciaId;

  if (!nota || !id) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-sm"></span> Guardando...';

  const res = await apiFetch(`/api/incidencia/${id}/seguimientos`, {
    method: 'POST',
    body: { nota }
  });

  if (res.ok) {
    input.value = '';
    await recargarTodo();
    verDetalleSesion(id);
  } else {
    showFeedback('Error al anotar', 'No se ha podido guardar la nota de seguimiento: ' + res.error, '');
  }
  btn.disabled = false;
  btn.innerHTML = '<span>Añadir Nota</span>';
}

function iniciarEdicionSeguimiento(segId, notaEncoded) {
  const nota = decodeURIComponent(notaEncoded);
  document.getElementById(`seg-text-${segId}`).style.display = 'none';
  document.getElementById(`seg-edit-${segId}`).style.display = 'block';
  document.getElementById(`seg-input-${segId}`).focus();
}

function cancelarEdicionSeguimiento(segId) {
  document.getElementById(`seg-text-${segId}`).style.display = 'block';
  document.getElementById(`seg-edit-${segId}`).style.display = 'none';
}

async function guardarEdicionSeguimiento(segId) {
  const nuevaNota = document.getElementById(`seg-input-${segId}`).value.trim();
  if (!nuevaNota) {
    alert('La nota no puede estar vacía');
    return;
  }
  
  const incidenciaId = window.currentIncidenciaId;
  
  const client = window.supabaseClient;
  const { error } = await client
    .from('seguimientos')
    .update({ nota: nuevaNota })
    .eq('id', segId);
    
  if (error) {
    showFeedback('Error', 'No se pudo editar la nota: ' + error.message, '');
    return;
  }

  await recargarTodo();
  verDetalleSesion(incidenciaId);
}

async function editarDescripcionIncidencia(id) {
  const resDet = await apiFetch(`/api/sesion/${id}/detalle`);
  let currentDesc = '';
  if (resDet.ok && resDet.data.sesion) {
    currentDesc = resDet.data.sesion.observaciones;
  }
  const nuevaDesc = await customPrompt('Editar descripción', 'Edita la descripción de la incidencia:', currentDesc);
  if (nuevaDesc === null) return;

  const res = await apiFetch(`/api/incidencia/${id}/editar`, {
    method: 'PUT',
    body: { notas: nuevaDesc }
  });

  if (res.ok) {
    showFeedback('Descripción actualizada', 'La descripción se ha modificado correctamente.', '');
    await cargarDatosBase();
    verDetalleSesion(id);
  } else {
    showFeedback('Error al editar', res.error, '');
  }
}

async function eliminarIncidencia(id) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar registros.', '');
    return;
  }
  const ok = await customConfirm(
    'Eliminar registro',
    '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.',
    ''
  );
  if (!ok) return;

  const res = await apiFetch(`/api/sesion/${id}`, { method: 'DELETE' });
  if (res.ok) {
    cerrarModal('modalDetalle');
    showFeedback('Registro eliminado', 'La incidencia ha sido eliminada correctamente.', '');
    await cargarDatosBase();
    await renderIncidencias();
  } else {
    showFeedback('Error al eliminar', res.error, '');
  }
}

async function verHistorialMaquina(nombreMaquina) {
  document.getElementById('historialMaquinaTitulo').textContent = nombreMaquina;
  const tbody = document.getElementById('tablaHistorialMaquina');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px"><span class="spinner"></span></td></tr>';
  abrirModal('modalHistorialMaquina');

  const filtrados = datosHistorial.filter(r => r.maquina === nombreMaquina);
  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px">Sin registros</td></tr>';
    return;
  }
  tbody.innerHTML = filtrados.map(r => `
    <tr>
      <td data-label="Fecha">${formatFechaHora(r.completado_en)}</td>
      <td data-label="Usuario"><div style="font-weight:600">${r.operario}</div><div style="font-size:10px;color:var(--text-muted)">${formatearRol(r.rol)}</div></td>
      <td data-label="Tipo"><span class="estado-badge ${r.tipo === 'Incidencia' ? 'vencido' : 'ok'}">${r.tipo}</span></td>
      <td data-label="Nota">${truncate(r.observaciones || '', 20)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="verDetalleSesion('${r.id}')">Detalles</button></td>
    </tr>
  `).join('');
}

function exportarCSV() {
  const rows = [['ID', 'Máquina', 'Sala', 'Por', 'Fecha', 'Observaciones']];
  const datos = incidenciasVisibles.length ? incidenciasVisibles : datosHistorial.filter(r => r.tipo === 'Incidencia');
  datos.forEach(r => rows.push([r.id, r.maquina, r.sala, r.operario, r.completado_en, r.observaciones || '']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `incidencias_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
