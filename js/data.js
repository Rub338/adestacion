// ── Gestión de Datos ─────────────────────────────────────────────────────────
async function cargarDatosBase() {
  console.time('Carga Inicial Bundled');
  console.log('Iniciando carga de datos...');
  
  const res = await apiFetch('/api/all-data');
  console.timeEnd('Carga Inicial Bundled');

  if (res.ok && res.data) {
    console.log('Datos recibidos:', {
      salas: res.data.salas?.length || 0,
      maquinas: res.data.maquinas?.length || 0,
      usuarios: res.data.usuarios?.length || 0,
      historial: res.data.historial?.length || 0
    });
    
    const d = res.data;
    datosSalas = d.salas || [];
    datosMaquinas = d.maquinas || [];
    datosUsuarios = d.usuarios || [];
    datosHistorial = d.historial || [];

    const incidenciasAbiertas = datosHistorial.filter(r => r.tipo === 'Incidencia' && !r.resuelta);
    console.log('Incidencias abiertas:', incidenciasAbiertas.length);
    
    datosMaquinas.forEach(maquina => {
      const incidenciasMaquina = incidenciasAbiertas.filter(inc => 
        String(inc.maquina_id) === String(maquina.id) || 
        (inc.maquina && inc.maquina.trim().toLowerCase() === maquina.nombre.trim().toLowerCase())
      );
      const incidenciaEnSeguimiento = incidenciasMaquina.find(inc => inc.en_seguimiento);
      
      maquina.tiene_incidencia = incidenciasMaquina.length > 0;
      maquina.incidencia_en_seguimiento = !!incidenciaEnSeguimiento;
      maquina.numero_incidencias = incidenciasMaquina.length;
    });
    
    cacheSeguimientosNotas = null;
    actualizarVistaDashboard();
  } else {
    console.error('Error al cargar datos:', res);
  }

  await renderActualSection();

  ['filtroSalaMaquinas', 'filtroSala', 'filtroSalaQR', 'nuevoMaquinaSala'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
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
  });

  const maqBadge = document.getElementById('badge-maquinas');
  if (maqBadge) {
    maqBadge.textContent = datosMaquinas.length;
    maqBadge.style.display = datosMaquinas.length > 0 ? 'inline' : 'none';
  }

  const pendientesCount = datosHistorial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && !r.en_seguimiento).length;
  const incBadge = document.getElementById('badge-incidencias');
  if (incBadge) {
    incBadge.textContent = pendientesCount;
    incBadge.style.display = pendientesCount > 0 ? 'inline-flex' : 'none';
  }

  const usuariosPendientes = datosUsuarios.filter(u => u.activo === false).length;
  const usuariosBadge = document.getElementById('badge-usuarios');
  if (usuariosBadge) {
    usuariosBadge.textContent = usuariosPendientes;
    usuariosBadge.style.display = usuariosPendientes > 0 ? 'inline-flex' : 'none';
  }

  const alertCard = document.getElementById('kpi-usuarios-pendientes-card');
  const alertCount = document.getElementById('kpi-usuarios-pendientes-count');
  if (alertCard) {
    alertCard.style.display = usuariosPendientes > 0 ? 'flex' : 'none';
  }
  if (alertCount) {
    alertCount.textContent = usuariosPendientes;
  }
}

async function recargarTodo() { 
  await cargarDatosBase(); 
}
