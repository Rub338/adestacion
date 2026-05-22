// ── Máquinas ─────────────────────────────────────────────────────────────────
let filtroEstadoMaquinasActual = 'todas';

function filtrarMaquinas() { renderMaquinas(); }

function filtrarEstadoMaquinas(filtro) {
  filtroEstadoMaquinasActual = filtro;
  ['todas','activas','inactivas'].forEach(f => {
    const btn = document.getElementById(`btn-maq-${f}`);
    if (btn) btn.classList.toggle('active', f === filtro);
  });
  renderMaquinas();
}

function renderMaquinas() {
  const salaFiltro = document.getElementById('filtroSalaMaquinas') ? document.getElementById('filtroSalaMaquinas').value : '';
  const searchQ = (document.getElementById('searchMaquinas')?.value || '').toLowerCase().trim();
  const grid = document.getElementById('gridMaquinas');

  if (isCargando && !datosMaquinas.length) {
    grid.innerHTML = skeletonMaquinas();
    return;
  }

  function normalize(s) { return s.toLowerCase().replace(/[\s\-_.]/g, ''); }
  function strictMatch(q, text) {
    return normalize(text).includes(q) || text.toLowerCase().includes(searchQ);
  }
  function fuzzyMatch(q, text) {
    const pattern = q.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(pattern, 'i').test(text);
  }

  const normQ = normalize(searchQ);
  let lista = salaFiltro
    ? datosMaquinas.filter(m => String(m.sala_id) === String(salaFiltro))
    : datosMaquinas;
  if (searchQ) {
    let filtered = lista.filter(m =>
      strictMatch(normQ, m.nombre || '') ||
      strictMatch(normQ, m.tipo || '') ||
      strictMatch(normQ, m.sala_nombre || '') ||
      strictMatch(normQ, m.etiqueta || '')
    );
    if (!filtered.length) {
      filtered = lista.filter(m =>
        fuzzyMatch(searchQ, m.nombre || '') ||
        fuzzyMatch(searchQ, m.tipo || '') ||
        fuzzyMatch(searchQ, m.sala_nombre || '') ||
        fuzzyMatch(searchQ, m.etiqueta || '')
      );
    }
    lista = filtered;
  }

  if (filtroEstadoMaquinasActual === 'activas') {
    lista = lista.filter(m => (m.estado || 'activa').toLowerCase().trim() !== 'inactiva');
  } else if (filtroEstadoMaquinasActual === 'inactivas') {
    lista = lista.filter(m => (m.estado || 'activa').toLowerCase().trim() === 'inactiva');
  }

  if (!lista.length) {
    grid.innerHTML = '<div class="empty-state"><div class="icon"></div><p>No hay máquinas registradas</p></div>';
    return;
  }

  function tarjetaMaquina(m) {
    const selectedId = localStorage.getItem('sgi_selected_machine');
    const isSelected = selectedId === String(m.id);
    const estado = calcularEstadoUnificado(m);

    const estOp = (m.estado || 'activa').toLowerCase().trim();
    const isActiva = estOp !== 'inactiva';
    const tieneIncidencia = estado.texto === 'SIN RESOLVER' || estado.texto === 'EN SEGUIMIENTO';

    const highlightStyle = isSelected ? 'border:2px solid var(--accent);box-shadow:0 0 0 3px rgba(79,142,247,0.15)' : '';

    let borderStyle = '';
    let dotColor = '';
    let dotShadow = '';

    if (tieneIncidencia && estado.texto === 'EN SEGUIMIENTO') {
      if (isActiva) {
        borderStyle = 'border: 2px solid var(--success); box-shadow: 0 0 0 1px var(--success), 0 0 0 3px rgba(245, 158, 11, 0.3);';
      } else {
        borderStyle = 'border: 2px solid #f59e0b; box-shadow: var(--shadow-card);';
      }
      dotColor = '#f59e0b';
      dotShadow = '0 0 8px #f59e0b';
    } else if (tieneIncidencia && isActiva) {
      borderStyle = 'border: 2px solid var(--success); box-shadow: 0 0 0 1px var(--success), 0 0 0 3px rgba(239, 68, 68, 0.3);';
      dotColor = '#ef4444';
      dotShadow = '0 0 8px #ef4444';
    } else if (tieneIncidencia && !isActiva) {
      borderStyle = 'border: 2px solid #ef4444; box-shadow: var(--shadow-card);';
      dotColor = '#ef4444';
      dotShadow = '0 0 8px #ef4444';
    } else if (!isActiva) {
      borderStyle = 'border: 1px solid #6b7280; opacity: 0.85; box-shadow: var(--shadow-card);';
      dotColor = '#6b7280';
      dotShadow = '0 0 6px #6b7280';
    } else {
      borderStyle = 'border: 2px solid var(--success); box-shadow: var(--shadow-card);';
      dotColor = 'var(--success)';
      dotShadow = '0 0 8px var(--success)';
    }

    const combinedBorderStyle = isSelected ? highlightStyle : borderStyle;

    const bgOp    = isActiva ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)';
    const colorOp = isActiva ? '#10b981' : '#4b5563';
    const textOp  = isActiva ? 'ACTIVA' : 'INACTIVA';

    const incBadge = tieneIncidencia
      ? `<span style="font-size:10px;font-weight:600;color:${estado.color};background:${estado.bg};border-radius:6px;padding:2px 7px;white-space:nowrap">${estado.texto}</span>`
      : '';

    const dotHtml = `<div style="width:10px;height:10px;border-radius:50%;margin-top:6px;flex-shrink:0;background:${dotColor};box-shadow:${dotShadow};margin-right:10px;"></div>`;

    return `
      <div class="maquina-card fade-in"
           draggable="true"
           ondragstart="handleDragStart(event, '${m.id}')"
           ondragend="handleDragEnd(event)"
           onclick="verDetalleMaquina('${m.id}')"
           style="cursor:grab;${combinedBorderStyle}" title="${estado.descripcion}">
        <div class="maquina-header" style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:flex-start;flex:1;min-width:0">
            ${dotHtml}
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <div class="maquina-nombre" style="font-weight:700;font-size:16px;color:var(--text-primary);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.nombre}</div>
              <div class="maquina-tipo" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);font-weight:500;">
                <span>${m.tipo || ''}</span>
                <span style="font-size:9px;font-weight:700;color:${colorOp};background:${bgOp};border:1px solid ${colorOp}30;border-radius:6px;padding:2px 7px;white-space:nowrap">${textOp}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="maquina-info" style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;display:flex;flex-direction:column;gap:2px;padding-left:20px;">
          <span style="color:var(--accent);font-weight:600">${m.sala_nombre || 'Sin sala'}</span>
          <span>${m.modelo || 'Sin modelo'}</span>
        </div>
        ${tieneIncidencia ? `<div style="padding-top:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding-left:20px;">${incBadge}</div>` : ''}
        <div class="maquina-actions" style="display:flex;gap:8px;margin-top:auto;justify-content:space-between;align-items:flex-end">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();verDetalleMaquina('${m.id}')">Ver</button>
          ${rolActual === 'admin' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="event.stopPropagation();eliminarMaquina('${m.id}')">Eliminar</button>` : ''}
        </div>
      </div>
    `;
  }

  function seccionEspacio(idSala, titulo, icono, color, maquinas) {
    const tieneMaquinas = maquinas.length > 0;
    const gridHtml = tieneMaquinas
      ? `<div class="grid-maquinas-inner" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; display: grid;">
           ${maquinas.map(tarjetaMaquina).join('')}
         </div>`
      : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;gap:12px">
           <div style="font-size:13px;color:var(--text-muted)">Sin máquinas en esta sala</div>
           ${rolActual === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); abrirModalNuevaMaquina('${idSala}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px">+ Añadir máquina</button>` : ''}
         </div>`;

    return `
      <div class="espacio-section drop-zone"
           ondragover="handleDragOver(event)"
           ondragleave="handleDragLeave(event)"
           ondrop="handleDrop(event, '${idSala}')"
           style="margin-bottom:40px; padding:20px; border-radius:16px; border: 1px solid var(--border); background: var(--bg-card); box-shadow: var(--shadow);">
        <div class="espacio-header" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <span style="font-size:22px">${icono}</span>
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--text-primary);margin:0">${titulo}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${(() => { const act = maquinas.filter(m => (m.estado||'activa').toLowerCase().trim() !== 'inactiva').length; const inact = maquinas.length - act; const p = [`${maquinas.length} máquina${maquinas.length!==1?'s':''}`]; if(act>0) p.push(`${act} activa${act!==1?'s':''}`); if(inact>0) p.push(`${inact} inactiva${inact!==1?'s':''}`); return p.join(' · '); })()}</div>
          </div>
        </div>
        ${gridHtml}
      </div>
    `;
  }

  let htmlResult = '';
  const commonBg = 'var(--bg-secondary)';
  const iconos = [''];
  datosSalas.forEach((sala, index) => {
    if (salaFiltro && String(sala.id) !== String(salaFiltro)) return;
    const maquinasSala = lista.filter(m => m.sala_id === sala.id);
    const color = commonBg;
    const icono = '';
    htmlResult += seccionEspacio(sala.id, sala.nombre, icono, color, maquinasSala);
  });

  const sinSala = lista.filter(m => !m.sala_id);
  if (sinSala.length > 0 && !salaFiltro) {
    htmlResult += seccionEspacio('', 'Sin Sala Asignada', '', 'rgba(100,100,100,0.05)', sinSala);
  }

  grid.innerHTML = htmlResult;

  const selectedId = localStorage.getItem('sgi_selected_machine');
  if (selectedId) {
    setTimeout(() => {
      const selectedCard = document.querySelector(`[onclick*="verDetalleMaquina('${selectedId}')"]`);
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  localStorage.removeItem('sgi_selected_machine');
}

// ── Drag & Drop ─────────────────────────────────────────────────────────────
function handleDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id);
  e.currentTarget.style.opacity = '0.4';
}

function handleDragEnd(e) {
  e.currentTarget.style.opacity = '1';
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.background = 'rgba(79,142,247,0.1)';
}

function handleDragLeave(e) {
  e.currentTarget.style.borderColor = 'transparent';
  e.currentTarget.style.background = '';
}

async function handleDrop(e, idSalaDestino) {
  e.preventDefault();
  const idMaquina = e.dataTransfer.getData('text/plain');
  e.currentTarget.style.borderColor = 'transparent';
  e.currentTarget.style.background = '';

  if (!idMaquina) return;

  const maquina = datosMaquinas.find(m => String(m.id) === idMaquina);
  const salaDestino = datosSalas.find(s => String(s.id) === String(idSalaDestino));
  const nombreMaquina = maquina?.nombre || 'Máquina';
  const nombreSalaDestino = salaDestino?.nombre || (idSalaDestino ? 'Sin sala asignada' : 'Sin sala asignada');
  const nombreSalaOrigen = maquina?.sala_nombre || 'Sin sala';

  if (String(maquina?.sala_id) === String(idSalaDestino)) {
    return;
  }

  const confirmado = await customConfirm(
    'Mover máquina',
    `¿Quieres mover "${nombreMaquina}" de "${nombreSalaOrigen}" a "${nombreSalaDestino}"?`,
    ''
  );

  if (!confirmado) return;

  try {
    const { error } = await window.supabaseClient
      .from('equipos')
      .update({ sala_id: idSalaDestino || null })
      .eq('id', idMaquina);

    if (error) throw error;

    await recargarTodo();
    renderMaquinas();
  } catch (err) {
    showFeedback('Error al mover', 'No se ha podido cambiar la máquina de sala.', '');
  }
}

// ── CRUD Máquinas ────────────────────────────────────────────────────────────
async function verDetalleMaquina(id) {
  const maq = datosMaquinas.find(m => m.id === id);
  if (!maq) return;
  document.getElementById('editMaquinaId').value = id;
  document.getElementById('editNombre').value = maq.nombre;
  document.getElementById('editModelo').value = maq.modelo || '';
  document.getElementById('editEstado').value = maq.estado || 'activa';
  document.getElementById('editNotas').value = maq.notas || '';

  renderSelectTipos('editTipo', maq.tipo);
  document.getElementById('editTipo').onchange = () => handleNuevoTipo('editTipo');

  if (rolActual === 'tecnico') {
    setModoEdicionMaquina(true, true);
  } else {
    setModoEdicionMaquina(false);
  }

  abrirModal('modalMaquina');
}

function setModoEdicionMaquina(editando, soloEstado = false) {
  const inputs = ['editNombre', 'editTipo', 'editModelo', 'editEstado', 'editNotas'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    
    const esEstado = (id === 'editEstado');
    const puedeEditar = soloEstado ? esEstado : editando;
    
    el.readOnly = !puedeEditar;
    if (el.tagName === 'SELECT') el.disabled = !puedeEditar;
    el.style.opacity = puedeEditar ? '' : '0.65';
    el.style.cursor = puedeEditar ? '' : 'default';
  });

  const modalBody = document.querySelector('#modalMaquina .modal-body');
  if (modalBody && !soloEstado) {
    modalBody.style.pointerEvents = editando ? '' : 'none';
    modalBody.style.userSelect = editando ? '' : 'none';
  }
  
  const btnToggle = document.getElementById('btnToggleEditarMaquina');
  if (btnToggle) {
    if (editando && !soloEstado) {
      btnToggle.innerHTML = 'Cancelar';
      btnToggle.className = 'btn btn-outline btn-sm';
      btnToggle.style.cssText = 'padding: 8px 16px; font-size:13px; font-weight:600; min-width:80px; border-radius:8px; transition:all 0.2s ease; border-color:var(--danger); color:var(--danger);';
    } else if (soloEstado) {
      btnToggle.style.display = 'none';
    } else {
      btnToggle.innerHTML = 'Editar';
      btnToggle.className = 'btn btn-primary btn-sm';
      btnToggle.style.cssText = 'padding: 8px 16px; font-size:13px; font-weight:600; min-width:80px; border-radius:8px; box-shadow:0 2px 8px rgba(59,130,246,0.3); transition:all 0.2s ease;';
      btnToggle.style.display = 'block';
    }
  }
  
  const btnGuardar = document.getElementById('btnGuardarMaquina');
  if (btnGuardar) btnGuardar.style.display = editando ? 'block' : 'none';
  
  const msgTecnico = document.getElementById('msgTecnico');
  if (msgTecnico) {
    msgTecnico.style.display = soloEstado ? 'block' : 'none';
  }
}

function toggleModoEdicionMaquina() {
  const isReadOnly = document.getElementById('editNombre').readOnly;
  setModoEdicionMaquina(isReadOnly);
}

async function editarMaquina(id) {
  await verDetalleMaquina(id);
  setModoEdicionMaquina(true);
}

async function guardarMaquina() {
  const id = document.getElementById('editMaquinaId').value;
  
  if (rolActual === 'tecnico') {
    const nuevoEstado = document.getElementById('editEstado').value;
    const { error } = await supabaseClient
      .from('equipos')
      .update({ estado: nuevoEstado })
      .eq('id', id);
      
    if (error) {
      showFeedback('Error', 'No se pudo actualizar el estado: ' + error.message, '');
      return;
    }
    
    showFeedback('Éxito', `Estado cambiado a ${nuevoEstado}`, '');
    await cargarDatosBase();
    renderMaquinas();
    cerrarModal('modalMaquina');
    return;
  }
  
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden guardar cambios en máquinas.', '');
    return;
  }
  
  const tipoVal = document.getElementById('editTipo').value.trim();
  if (tipoVal === '__NUEVO__') {
    showFeedback('Error', 'Selecciona un tipo válido o crea uno nuevo.', '');
    return;
  }
  const datos = {
    nombre: document.getElementById('editNombre').value.trim(),
    tipo: tipoVal,
    modelo: document.getElementById('editModelo').value.trim(),
    estado: document.getElementById('editEstado').value,
    notas: document.getElementById('editNotas').value.trim() || null,
  };
  if (!datos.nombre) {
    showFeedback('Error', 'El nombre de la máquina es obligatorio.', '');
    return;
  }
  const res = await apiFetch(`/api/maquina/${id}`, { method: 'PUT', body: datos });
  if (res.ok) {
    cerrarModal('modalMaquina');
    await cargarDatosBase();
    renderMaquinas();
    showFeedback('Máquina guardada', 'Los cambios se han guardado correctamente.', '');
  } else {
    showFeedback('Error al guardar', (res.error || 'No se pudieron guardar los cambios.'), '');
  }
}

function abrirModalNuevaMaquina(salaId = '') {
  try {
    const nombreEl = document.getElementById('nuevoMaquinaNombre');
    const modeloEl = document.getElementById('nuevoMaquinaModelo');
    const anchoEl = document.getElementById('nuevoMaquinaAncho');
    const altoEl = document.getElementById('nuevoMaquinaAlto');
    const profEl = document.getElementById('nuevoMaquinaProfundidad');
    const notasEl = document.getElementById('nuevoMaquinaNotas');
    const estadoEl = document.getElementById('nuevoMaquinaEstado');
    const msgEl = document.getElementById('msgNuevaMaquina');
    const tipoSelect = document.getElementById('nuevoMaquinaTipo');
    const salaSelect = document.getElementById('nuevoMaquinaSala');

    if (nombreEl) nombreEl.value = '';
    if (modeloEl) modeloEl.value = '';
    if (anchoEl) anchoEl.value = '';
    if (altoEl) altoEl.value = '';
    if (profEl) profEl.value = '';
    if (notasEl) notasEl.value = '';
    if (estadoEl) estadoEl.value = 'activa';
    if (msgEl) msgEl.innerHTML = '';

    if (tipoSelect) {
      renderSelectTipos('nuevoMaquinaTipo');
      tipoSelect.onchange = () => handleNuevoTipo('nuevoMaquinaTipo');
    }

    if (salaSelect && salaSelect.options.length <= 1) {
      poblarSelectsSalas();
    }
    if (salaSelect && salaId) {
      salaSelect.value = salaId;
    }

    abrirModal('modalNuevaMaquina');
  } catch (err) {
    console.error('Error al abrir modal de nueva máquina:', err);
    showFeedback('Error', 'No se pudo abrir el formulario de nueva máquina.', '');
  }
}

async function crearMaquina() {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden crear máquinas.', '');
    return;
  }
  const nombreEl = document.getElementById('nuevoMaquinaNombre');
  const salaEl = document.getElementById('nuevoMaquinaSala');
  const tipoEl = document.getElementById('nuevoMaquinaTipo');
  const modeloEl = document.getElementById('nuevoMaquinaModelo');
  const estadoEl = document.getElementById('nuevoMaquinaEstado');
  const notasEl = document.getElementById('nuevoMaquinaNotas');
  const msgEl = document.getElementById('msgNuevaMaquina');
  
  if (!nombreEl || !salaEl || !tipoEl) {
    showFeedback('Error', 'No se pudieron cargar los campos del formulario. Recarga la página.', '');
    return;
  }
  
  const nombre = nombreEl.value.trim();
  const sala_id = salaEl.value;
  let tipo = tipoEl.value;
  const modelo = modeloEl?.value.trim() || '';
  const estado = estadoEl?.value || 'activa';
  const notas = notasEl?.value.trim() || null;
  const msg = msgEl;

  if (tipo === '__NUEVO__') {
    msg.innerHTML = '<div class="alert alert-warning">Selecciona un tipo válido o crea uno nuevo</div>';
    return;
  }

  if (!nombre || !sala_id) {
    msg.innerHTML = '<div class="alert alert-warning">Nombre y Sala son obligatorios</div>';
    return;
  }

  const res = await apiFetch('/api/maquinas', {
    method: 'POST',
    body: {
      nombre, sala_id, tipo, modelo, estado, notas
    }
  });

  if (res.ok) {
    cerrarModal('modalNuevaMaquina');
    await cargarDatosBase();
    renderMaquinas();
  } else {
    msg.innerHTML = `<div class="alert alert-danger">${res.error}</div>`;
  }
}

async function eliminarMaquina(id) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar máquinas.', '');
    return;
  }
  const ok = await customConfirm(
    'Eliminar máquina',
    '¿Estás seguro? Se eliminarán también todos sus registros. Esta acción no se puede deshacer.',
    ''
  );
  if (!ok) return;
  const res = await apiFetch(`/api/maquina/${id}`, { method: 'DELETE' });
  if (res.ok) {
    cerrarModal('modalMaquina');
    await cargarDatosBase();
    renderMaquinas();
    showFeedback('Máquina eliminada', 'La máquina y sus registros asociados han sido eliminados.', '');
  } else {
    showFeedback('Error al eliminar', res.error, '');
  }
}

// ── Tipos de Máquina ─────────────────────────────────────────────────────────
function renderSelectTipos(selectId, valorSeleccionado = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const tipos = [...new Set(datosMaquinas.map(m => m.tipo).filter(Boolean))].sort();
  const tiposBase = ['Impresora FDM', 'Impresora Resina', 'CNC / Fresadora', 'Cortadora Láser'];
  let todos = [...new Set([...tiposBase, ...tipos])];

  if (valorSeleccionado && !todos.some(t => t.toLowerCase() === valorSeleccionado.toLowerCase())) {
    todos.push(valorSeleccionado);
    todos.sort();
  }

  sel.innerHTML = '';
  todos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
  const addOpt = document.createElement('option');
  addOpt.value = '__NUEVO__';
  addOpt.textContent = '➕ Añadir otro tipo...';
  sel.appendChild(addOpt);
  const delOpt = document.createElement('option');
  delOpt.value = '__ELIMINAR__';
  delOpt.textContent = '🗑️ Eliminar un tipo...';
  sel.appendChild(delOpt);
  const match = todos.find(t => t.toLowerCase() === (valorSeleccionado || '').toLowerCase());
  if (match) sel.value = match;
}

function primerTipoValido(sel) {
  return Array.from(sel.options).find(o => o.value !== '__NUEVO__' && o.value !== '__ELIMINAR__')?.value || '';
}

async function handleNuevoTipo(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  if (sel.value === '__ELIMINAR__') {
    await handleEliminarTipo(selectId);
    return;
  }

  if (sel.value !== '__NUEVO__') return;
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden crear nuevos tipos.', '');
    sel.value = primerTipoValido(sel);
    return;
  }
  const nuevo = await customPrompt('Nuevo tipo', 'Ingrese el nombre del nuevo tipo de máquina:');
  if (!nuevo || !nuevo.trim()) {
    sel.value = primerTipoValido(sel);
    return;
  }

  const nombre = nuevo.trim();
  if (nombre.toLowerCase() === '__nuevo__') {
    showFeedback('Nombre reservado', '"__NUEVO__" no es un nombre válido para un tipo.', '');
    sel.value = primerTipoValido(sel);
    return;
  }
  const nombreLower = nombre.toLowerCase();

  const existente = Array.from(sel.options).find(o => o.value !== '__NUEVO__' && o.value !== '__ELIMINAR__' && o.value.toLowerCase() === nombreLower);
  if (existente) {
    sel.value = existente.value;
    showFeedback('Tipo existente', `El tipo "${existente.value}" ya existe y ha sido seleccionado.`, '');
    return;
  }

  const addOpt = sel.querySelector('option[value="__NUEVO__"]');
  const opt = document.createElement('option');
  opt.value = nombre; opt.textContent = nombre;
  sel.insertBefore(opt, addOpt);
  sel.value = nombre;
  showFeedback('Tipo creado', `Se ha añadido "${nombre}" como nuevo tipo de máquina.`, '✅');
}

async function handleEliminarTipo(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar tipos.', '');
    sel.value = primerTipoValido(sel);
    return;
  }

  const tiposBase = ['Impresora FDM', 'Impresora Resina', 'CNC / Fresadora', 'Cortadora Láser'];
  const tiposEliminables = Array.from(sel.options).filter(
    o => o.value !== '__NUEVO__' && o.value !== '__ELIMINAR__' && !tiposBase.includes(o.value)
  );

  if (tiposEliminables.length === 0) {
    showFeedback('Sin tipos personalizados', 'No hay tipos personalizados que eliminar. Los tipos base no se pueden borrar.', '');
    sel.value = primerTipoValido(sel);
    return;
  }

  const listaTexto = tiposEliminables.map((o, i) => `${i + 1}. ${o.value}`).join('\n');
  const respuesta = await customPrompt(
    'Eliminar tipo',
    `Escribe el nombre exacto del tipo a eliminar:\n${listaTexto}`
  );

  if (!respuesta || !respuesta.trim()) {
    sel.value = primerTipoValido(sel);
    return;
  }

  const nombreBuscado = respuesta.trim().toLowerCase();
  const optAEliminar = tiposEliminables.find(o => o.value.toLowerCase() === nombreBuscado);

  if (!optAEliminar) {
    showFeedback('Tipo no encontrado', `No se encontró el tipo "${respuesta.trim()}" entre los tipos personalizados.`, '');
    sel.value = primerTipoValido(sel);
    return;
  }

  const enUso = datosMaquinas.some(m => m.tipo && m.tipo.toLowerCase() === optAEliminar.value.toLowerCase());
  if (enUso) {
    const ok = await customConfirm(
      'Tipo en uso',
      `El tipo "${optAEliminar.value}" está asignado a alguna máquina. ¿Eliminar igualmente de la lista? (No afecta a las máquinas existentes.)`,
      '⚠️'
    );
    if (!ok) {
      sel.value = primerTipoValido(sel);
      return;
    }
  }

  ['nuevoMaquinaTipo', 'editTipo'].forEach(id => {
    const s = document.getElementById(id);
    if (!s) return;
    const opt = Array.from(s.options).find(o => o.value.toLowerCase() === optAEliminar.value.toLowerCase());
    if (opt) s.removeChild(opt);
    if (s.value === optAEliminar.value || s.value === '') s.value = primerTipoValido(s);
  });

  showFeedback('Tipo eliminado', `El tipo "${optAEliminar.value}" ha sido eliminado de la lista.`, '🗑️');
}
