// ── Gestión de Salas ───────────────────────────────────────────────────────────
function abrirModalGestionSalas() {
  abrirModal('modalGestionSalas');
  renderListaSalas();
}

function renderListaSalas() {
  const tbody = document.getElementById('listaSalasGestion');
  if (!tbody) return;

  if (datosSalas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text-muted)">No hay salas creadas.</td></tr>';
    return;
  }

  tbody.innerHTML = datosSalas.map(s => `
    <tr>
      <td style="padding:10px">
        <input type="text" class="form-control" value="${s.nombre}" 
          style="padding:4px 8px; font-weight:600; background:transparent"
          onchange="editarSala('${s.id}', this.value)"
        >
      </td>
      <td style="padding:10px;text-align:right">
        <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:rgba(239,68,68,0.2);font-weight:bold" 
          onclick="borrarSala('${s.id}', '${s.nombre}')">
          ✕
        </button>
      </td>
    </tr>
  `).join('');
}

async function editarSala(id, nuevoNombre) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden editar salas.', '');
    return;
  }
  if (!nuevoNombre.trim()) return;
  try {
    const { error } = await window.supabaseClient
      .from('salas')
      .update({ nombre: nuevoNombre })
      .eq('id', id);

    if (error) throw error;
    await recargarTodo();
    poblarSelectsSalas();
  } catch (err) {
    console.error("Error al editar sala:", err);
  }
}

async function crearSala() {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden crear salas.', '');
    return;
  }
  const input = document.getElementById('nuevaSalaNombre');
  const nombre = input.value.trim();
  if (!nombre) return showFeedback('Nombre requerido', "Debes escribir un nombre para la nueva sala.", '');

  try {
    const { data, error } = await window.supabaseClient
      .from('salas')
      .insert([{ nombre }])
      .select();

    if (error) throw error;

    input.value = '';
    await recargarTodo();
    renderListaSalas();
    poblarSelectsSalas();
    showFeedback('Sala creada', 'La nueva sala se ha registrado correctamente en el sistema.', '');
  } catch (err) {
    showFeedback('Error al crear', "No se ha podido registrar la sala en la base de datos.", '');
  }
}

async function borrarSala(id, nombre) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar salas.', '');
    return;
  }
  const maquinasEnSala = datosMaquinas.filter(m => m.sala_id === id);
  if (maquinasEnSala.length > 0) {
    return showFeedback('Sala con Máquinas', `No puedes borrar la sala "${nombre}" porque tiene ${maquinasEnSala.length} máquinas asociadas.`, '');
  }

  try {
    const { error } = await window.supabaseClient
      .from('salas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await recargarTodo();
    renderListaSalas();
    poblarSelectsSalas();
  } catch (err) {
    console.error("Error al borrar sala:", err);
  }
}

function poblarSelectsSalas() {
  ['filtroSalaMaquinas', 'filtroSala', 'filtroSalaQR', 'nuevoMaquinaSala'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    if (id !== 'nuevoMaquinaSala') {
      el.innerHTML = '<option value="">Todas las salas</option>';
    } else {
      el.innerHTML = '<option value="">Seleccione una sala...</option>';
    }
    datosSalas.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.nombre;
      el.appendChild(opt);
    });
    el.value = currentVal;
  });
}
