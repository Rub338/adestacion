'use strict';

const API = 'https://script.google.com/macros/s/AKfycbwW2_UWpOS45F-3BbyVbUvtxIJ3b_OP_Pnl_cSgSwO-BXz9nSzqoTb8oxnh185za0M/exec'; // <--- URL DE LA WEB APP OPTIMIZADA
let datosSalas = [];
let datosMaquinas = [];
let datosUsuarios = [];
let datosHistorial = []; // Reutilizar datos ya cargados
let isCargando = false;
let cacheSeguimientosNotas = null; // Cache de notas por incidencia_id
// Base URL para los códigos QR
let serverHost = 'https://manuel9121231.github.io/adestacion';

async function detectarServidor() {
  // serverHost fijado a GitHub Pages — no se sobreescribe
}

let rolActual = 'admin'; // Se actualiza al cargar la sesión

// ── Función auxiliar para calcular estado unificado ─────────────────────────────
function calcularEstadoUnificado(maquina) {
  const estadoOperativo = (maquina.estado || 'activa').toLowerCase().trim();
  const tieneIncidencia = maquina.tiene_incidencia || false;
  const enSeguimiento = maquina.incidencia_en_seguimiento || false;

  // Incidencia tiene prioridad sobre estado operativo
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

// ── Cargar rol del usuario desde sesión ──
async function cargarRolUsuario() {
  try {
    // Primero verificar si hay sesión de administrador
    const adminSessionStr = localStorage.getItem('sgi_admin_session');
    console.log('DEBUG - admin_session:', adminSessionStr);
    if (adminSessionStr) {
      const adminSession = JSON.parse(adminSessionStr);
      if (adminSession.type === 'superadmin') {
        rolActual = 'admin';
      } else if (adminSession.type) {
        rolActual = adminSession.type; // 'admin' o 'tecnico'
      } else if (adminSession.username || adminSession.nombre) {
        rolActual = 'admin';
      }
      console.log('DEBUG - Rol asignado desde admin_session:', rolActual);
      return;
    }

    // Si no hay sesión admin, verificar sesión de usuario normal
    const sessionStr = localStorage.getItem('sgi_user_session');
    console.log('DEBUG - user_session:', sessionStr);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      rolActual = session.rol || 'usuario';
      console.log('DEBUG - Rol asignado desde user_session:', rolActual);
    }
  } catch (err) {
    console.error('Error al cargar rol:', err);
  }
}

// ── Obtener nombre del admin actual ──
function getNombreAdmin() {
  try {
    const s = JSON.parse(localStorage.getItem('sgi_admin_session') || '{}');
    return s.nombre || s.username || 'Administrador';
  } catch { return 'Administrador'; }
}

function getEmailAdmin() {
  try {
    const s = JSON.parse(localStorage.getItem('sgi_admin_session') || '{}');
    return s.email || '';
  } catch { return ''; }
}

// ── Formatear rol para visualización ──
function formatearRol(rol) {
  const map = { usuario: 'Usuario', admin: 'Administrador', tecnico: 'Técnico', superadmin: 'Administrador' };
  return map[rol] || (rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : 'Usuario');
}

// ── Obtener nombre y rol del usuario actual (admin o usuario normal) ──
function getUsuarioActualInfo() {
  try {
    const adminSession = JSON.parse(localStorage.getItem('sgi_admin_session') || 'null');
    if (adminSession) {
      const nombre = adminSession.nombre || adminSession.username || 'Administrador';
      const rol = adminSession.type === 'superadmin' ? 'superadmin' : (adminSession.type || 'admin');
      return { id: adminSession.userId, nombre, rol };
    }
    const userSession = JSON.parse(localStorage.getItem('sgi_user_session') || 'null');
    if (userSession) {
      return { id: userSession.userId, nombre: userSession.nombre || 'Usuario', rol: userSession.rol || 'usuario' };
    }
  } catch {}
  return { id: null, nombre: 'Usuario', rol: 'usuario' };
}


document.addEventListener('DOMContentLoaded', async () => {
  const adminSessionStr = localStorage.getItem('sgi_admin_session');
  const userSessionStr  = localStorage.getItem('sgi_user_session');

  // Si hay sesión admin activa y una máquina pendiente por QR, redirigir directamente
  const pendingMaquinaIdOnLoad = localStorage.getItem('sgi_pending_maquinaId');
  if (pendingMaquinaIdOnLoad && adminSessionStr) {
    localStorage.removeItem('sgi_pending_maquinaId');
    window.location.href = `operario.html?maquinaId=${pendingMaquinaIdOnLoad}`;
    return;
  }

  detectarServidor(); // Cargar IP real para los QRs
  await cargarRolUsuario(); // Cargar rol del usuario

  // Si es usuario normal (no admin ni técnico), redirigir al portal
  if (rolActual === 'usuario') {
    window.location.href = 'estado.html';
    return;
  }

  // Prefer admin session; si no, permitir sesión de 'tecnico' (usuario) para entrar
  let sgiSession = null;
  if (adminSessionStr) {
    sgiSession = JSON.parse(adminSessionStr || '{}');
  } else if (userSessionStr && (rolActual === 'tecnico' || rolActual === 'admin')) {
    // Permitimos que técnicos accedan al panel; los permisos internos seguirán aplicándose
    try {
      sgiSession = JSON.parse(userSessionStr || '{}');
      sgiSession._isUserSession = true; // marca que viene de user_session
    } catch(e) { sgiSession = null; }
  } else {
    // No hay sesión adecuada: esperar a login admin
    return;
  }
  window.sgiAdminSession = sgiSession;

  try {
    isCargando = true;
    console.log('Iniciando carga del dashboard...');

    // Inyectar interfaz de forma segura
    const container = document.getElementById('dashboardContent');
    console.log('Container encontrado:', !!container);
    
    if (container) {
      console.log('Inyectando HTML del dashboard...');
      container.innerHTML = DASHBOARD_HTML;
      console.log('HTML inyectado correctamente');
    } else {
      console.error('No se encontró el container dashboardContent');
      return;
    }

    // Mostrar nombre y rol en sidebar footer y dropdown Cuenta
    const adminName = getNombreAdmin();
    const adminEmail = getEmailAdmin();
    const rolLabel = formatearRol(rolActual);
    const footerVersion = container?.querySelector('.sidebar-footer div');
    if (footerVersion) {
      footerVersion.innerHTML = ``;
    }
    const dropdownName = document.getElementById('dropdownUserName');
    const dropdownRole = document.getElementById('dropdownUserRole');
    const dropdownEmail = document.getElementById('dropdownUserEmail');
    const accountBtn = document.getElementById('accountBtn');
    if (dropdownName) dropdownName.textContent = adminName;
    if (dropdownRole) dropdownRole.textContent = rolLabel;
    if (dropdownEmail) dropdownEmail.textContent = adminEmail;
    if (accountBtn) accountBtn.style.display = 'block';

    // Ocultar solo usuarios para técnicos
    if (rolActual === 'tecnico') {
      const navUsuarios = document.getElementById('nav-usuarios');
      if (navUsuarios) navUsuarios.style.display = 'none';
    }

    // Ocultar controles sensibles para técnicos (solo admin puede verlos)
    if (rolActual !== 'admin') {
      ['btnBorrarMaquinaModal','btnNuevaMaquina','btnToggleEditarMaquina','btnGuardarMaquina','btnGestionarSalas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }

    // Restaurar sección guardada al refrescar (si existe y el rol tiene permiso)
    const savedSection = localStorage.getItem('sgi_admin_section');
    const seccionesRestringidasTecnico = ['usuarios'];
    const seccionesSoloPanel = ['usuarios', 'qrcodes'];
    let puedeRestaurar = !!savedSection && savedSection !== 'dashboard';
    if (puedeRestaurar) {
      if (rolActual === 'tecnico' && seccionesRestringidasTecnico.includes(savedSection)) puedeRestaurar = false;
      else if (rolActual !== 'admin' && rolActual !== 'tecnico' && seccionesSoloPanel.includes(savedSection)) puedeRestaurar = false;
    }
    if (puedeRestaurar) {
      navigateTo(savedSection);
    } else if (savedSection && savedSection !== 'dashboard') {
      localStorage.removeItem('sgi_admin_section');
    }

    const grid = document.getElementById('gridMaquinas');
    if (grid) grid.innerHTML = skeletonMaquinas();
    const tbody = document.getElementById('dashboardUltimos');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)"><span class="spinner" style="display:inline-block;margin-right:8px"></span>Conectando con la base de datos...</td></tr>';

    // Cargar TODO en una sola llamada
    await cargarDatosBase();

    // Auto-sincronización cada 2 minutos
    setInterval(() => {
      recargarTodo();
    }, 120000);
  } catch (err) {
    console.error('Error durante la carga inicial:', err);
  } finally {
    isCargando = false;
  }
});

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

async function cargarDatosBase() {
  console.time('Carga Inicial Bundled');
  console.log('Iniciando carga de datos...');
  
  // Una sola llamada para traerlo TODO
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

    // Enriquecer datos de máquinas con información de incidencias
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
    
    console.log('Maquinas enriquecidas:', datosMaquinas.map(m => ({
      nombre: m.nombre,
      estado: m.estado,
      tiene_incidencia: m.tiene_incidencia,
      incidencia_en_seguimiento: m.incidencia_en_seguimiento
    })));

    // Invalidar cache de seguimientos al recargar datos (nuevas notas podrían haberse añadido)
    cacheSeguimientosNotas = null;

    // Poblar dashboard con los datos ya recibidos
    actualizarVistaDashboard();
  } else {
    console.error('Error al cargar datos:', res);
  }

  // Actualizar la vista actual ahora que los datos están listos
  await renderActualSection();

  // Poblar selects de salas
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

  // El filtro de operario ahora es un input de texto, no necesita población inicial

  // Badge máquinas total
  const maqBadge = document.getElementById('badge-maquinas');
  if (maqBadge) {
    maqBadge.textContent = datosMaquinas.length;
    maqBadge.style.display = datosMaquinas.length > 0 ? 'inline' : 'none';
  }

  // Badge incidencias pendientes (solo las sin resolver - rojas, no en seguimiento)
  const pendientesCount = datosHistorial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && !r.en_seguimiento).length;
  const incBadge = document.getElementById('badge-incidencias');
  if (incBadge) {
    incBadge.textContent = pendientesCount;
    incBadge.style.display = pendientesCount > 0 ? 'inline-flex' : 'none';
  }

  // Badge usuarios pendientes de alta
  const usuariosPendientes = datosUsuarios.filter(u => u.activo === false).length;
  const usuariosBadge = document.getElementById('badge-usuarios');
  if (usuariosBadge) {
    usuariosBadge.textContent = usuariosPendientes;
    usuariosBadge.style.display = usuariosPendientes > 0 ? 'inline-flex' : 'none';
  }

  // Alerta en dashboard para usuarios pendientes
  const alertCard = document.getElementById('kpi-usuarios-pendientes-card');
  const alertCount = document.getElementById('kpi-usuarios-pendientes-count');
  if (alertCard) {
    alertCard.style.display = usuariosPendientes > 0 ? 'flex' : 'none';
  }
  if (alertCount) {
    alertCount.textContent = usuariosPendientes;
  }
}

// ── Incidencias ─────────────────────────────────────────────────────────────
let filtroIncActual = 'todas';
let ordenIncActual = 'fecha-desc';
let incidenciasVisibles = []; // Lista filtrada actual para exportar CSV

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

  // Actualizar label de filtro activo
  const filtroLabelEl = document.getElementById('filtro-incidencias-label');
  if (filtroLabelEl) {
    const nombresFiltro = { 'todas': 'Abiertas', 'pendientes': 'Sin resolver', 'seguimiento': 'En seguimiento', 'resueltas': 'Resueltas' };
    filtroLabelEl.textContent = 'Filtrado por: ' + nombresFiltro[filtro];
  }

  // Actualizar todos los botones (fondo relleno + texto blanco cuando activo)
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

  // Cálculo de KPIs
  const totalPendientes = lista.filter(r => !r.resuelta && !r.en_seguimiento).length;
  const totalResueltas  = lista.filter(r => r.resuelta).length;
  const totalSeguimiento = lista.filter(r => !r.resuelta && r.en_seguimiento).length;

  if (document.getElementById('kpi-inc-pendientes')) document.getElementById('kpi-inc-pendientes').textContent = totalPendientes;
  if (document.getElementById('kpi-inc-resueltas'))  document.getElementById('kpi-inc-resueltas').textContent  = totalResueltas;
  if (document.getElementById('kpi-inc-seguimiento')) document.getElementById('kpi-inc-seguimiento').textContent = totalSeguimiento;

  // Mostrar/ocultar tarjetas KPI según filtro activo (transición suave)
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
    // 'todas' — activas sin resueltas
    lista = lista.filter(r => !r.resuelta);
  }

  // Filtros por fecha
  const desde = document.getElementById('filtroIncDesde')?.value;
  const hasta = document.getElementById('filtroIncHasta')?.value;
  if (desde) {
    lista = lista.filter(r => new Date(r.completado_en || r.iniciado_en) >= new Date(desde));
  }
  if (hasta) {
    lista = lista.filter(r => new Date(r.completado_en || r.iniciado_en) <= new Date(hasta + 'T23:59:59'));
  }

  // Guardar lista filtrada para exportación CSV
  incidenciasVisibles = lista;

  // Cargar últimas notas de seguimiento para incidencias en seguimiento (cache primero, async si falta)
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

  // Ordenar según criterio seleccionado
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

    // Incident state
    const incColor    = resuelta ? 'var(--ok)' : (esSeguimiento ? 'var(--warning)' : 'var(--danger)');
    const incBg       = resuelta ? 'rgba(16,185,129,0.1)' : (esSeguimiento ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)');
    const incText     = resuelta ? 'RESUELTA' : (esSeguimiento ? 'EN SEGUIMIENTO' : 'SIN RESOLVER');
    const borderColor = resuelta ? 'var(--ok)' : (esSeguimiento ? 'var(--warning)' : 'var(--danger)');

    // Machine operative state
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

  // La query de seguimientos sigue ejecutándose en segundo plano y actualiza los textos cuando llega
  seguimientosPromise;
}

// ── Navegación ────────────────────────────────────────────────────────────────
const sectionTitles = {
  dashboard: ['Resumen', 'Resumen del sistema'],
  maquinas: ['Máquinas y Salas', 'Gestión de máquinas y salas'],
  incidencias: ['Incidencias', 'Gestión de fallos técnicos y reparaciones'],
  qrcodes: ['Códigos QR', 'QR individuales para el usuario móvil'],
  usuarios: ['Usuarios del Sistema', 'Gestión de accesos y privilegios de usuario']
};

async function navigateTo(section, machineId = null, incFilter = null) {
  // Verificación de roles (solo admin puede ver gestión de usuarios y QR codes)
  // Técnicos pueden ver todo excepto usuarios y qrcodes
  const rutasRestringidasParaTecnico = ['usuarios'];
  let idToShow = section;

  if (rolActual === 'tecnico' && rutasRestringidasParaTecnico.includes(section)) {
    idToShow = 'restringido';
  } else if (rolActual !== 'admin' && rolActual !== 'tecnico' && (section === 'usuarios' || section === 'qrcodes')) {
    idToShow = 'restringido';
  }

  // Guardar máquina seleccionada si se proporciona
  if (machineId) {
    localStorage.setItem('sgi_selected_machine', machineId);
  } else if (section === 'maquinas') {
    localStorage.removeItem('sgi_selected_machine');
  }

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + idToShow).classList.add('active');
  if (idToShow !== 'restringido') {
    const navItem = document.getElementById('nav-' + section);
    if (navItem) navItem.classList.add('active');
  } else {
    document.getElementById('topbarTitle').textContent = 'Acceso Denegado';
    document.getElementById('topbarSubtitle').textContent = 'Sección restringida por permisos';
    // No persistir secciones a las que no se tiene acceso
    localStorage.removeItem('sgi_admin_section');
    return;
  }

  const [title, sub] = sectionTitles[section] || [section, ''];
  document.getElementById('topbarTitle').textContent = title;
  document.getElementById('topbarSubtitle').textContent = sub;

  // Guardar sección actual para persistencia al refrescar
  localStorage.setItem('sgi_admin_section', section);

  // Cargar datos bajo demanda
  if (section === 'maquinas') renderMaquinas();
  if (section === 'incidencias') await renderIncidencias(incFilter || filtroIncActual);
  if (section === 'usuarios') renderUsuarios();
  if (section === 'qrcodes') renderQRs();
}

async function renderActualSection() {
  const activeSection = document.querySelector('.section.active');
  if (!activeSection) return;
  const id = activeSection.id.replace('section-', '');
  if (id === 'maquinas') renderMaquinas();
  if (id === 'incidencias') await renderIncidencias();
  if (id === 'usuarios') renderUsuarios();
  if (id === 'qrcodes') renderQRs();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('open');
}

function toggleSidebarDesktop() {
  const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sgi_sidebar_collapsed', isCollapsed ? 'true' : 'false');
}

// Inicializar el estado del sidebar en escritorio
(function initSidebar() {
  const isCollapsed = localStorage.getItem('sgi_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.body.classList.add('sidebar-collapsed');
  }
})();

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function cargarDashboard() {
  // Los datos ya se cargan en cargarDatosBase(); esta función solo actualiza la vista
  if (!datosHistorial.length) return;
  actualizarVistaDashboard();
}

function actualizarVistaDashboard() {
  const historial = datosHistorial;

  // KPI Sin resolver y En seguimiento
  const sinResolver = historial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && !r.en_seguimiento).length;
  const incidenciasEnSeguimiento = historial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && r.en_seguimiento).length;
  const kpiSinResolver = document.getElementById('kpi-sin-resolver');
  if (kpiSinResolver) kpiSinResolver.textContent = sinResolver;
  const kpiSeg = document.getElementById('kpi-en-seguimiento-dash');
  if (kpiSeg) kpiSeg.textContent = incidenciasEnSeguimiento;

  // KPI Máquinas — basado en estado físico (activa/inactiva)
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

  // Mini-lista incidencias sin resolver
  const incPendientes = historial.filter(r => r.tipo === 'Incidencia' && !r.resuelta);
  renderIncPendientesDashboard(incPendientes.slice(0, 5));

  actualizarSubtitulosSecciones();
}

function actualizarSubtitulosSecciones() {
  // Subtítulo Máquinas y Salas
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

  // Subtítulo Incidencias
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

  // Subtítulo Usuarios
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


// ── Máquinas ──────────────────────────────────────────────────────────────────
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
    // Try strict first
    let filtered = lista.filter(m =>
      strictMatch(normQ, m.nombre || '') ||
      strictMatch(normQ, m.tipo || '') ||
      strictMatch(normQ, m.sala_nombre || '') ||
      strictMatch(normQ, m.etiqueta || '')
    );
    // Fallback to fuzzy if strict gives no results
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

    // Logic to match estado.html exactly for the colored outlines and dot
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
          <!-- inc badge handled separately below -->
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

  // Sección para máquinas sin sala asignada
  const sinSala = lista.filter(m => !m.sala_id);
  if (sinSala.length > 0 && !salaFiltro) {
    htmlResult += seccionEspacio('', 'Sin Sala Asignada', '', 'rgba(100,100,100,0.05)', sinSala);
  }

  grid.innerHTML = htmlResult;

  // Scroll hacia la máquina seleccionada si existe
  const selectedId = localStorage.getItem('sgi_selected_machine');
  if (selectedId) {
    setTimeout(() => {
      const selectedCard = document.querySelector(`[onclick*="verDetalleMaquina('${selectedId}')"]`);
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // Limpiar máquina seleccionada después de mostrar el resaltado
  localStorage.removeItem('sgi_selected_machine');
}

// ── Lógica Drag & Drop ──────────────────────────────────────────────────────
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
  e.currentTarget.style.background = ''; // Se restaura por CSS o inline original
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
    return; // Misma sala, no hacer nada
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

function filtrarMaquinas() { renderMaquinas(); }

let filtroEstadoMaquinasActual = 'todas';

function filtrarEstadoMaquinas(filtro) {
  filtroEstadoMaquinasActual = filtro;
  ['todas','activas','inactivas'].forEach(f => {
    const btn = document.getElementById(`btn-maq-${f}`);
    if (btn) btn.classList.toggle('active', f === filtro);
  });
  renderMaquinas();
}

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

  // Por defecto, abrir en modo lectura
  // Si es técnico, abrir en modo edición limitada (solo estado)
  if (rolActual === 'tecnico') {
    setModoEdicionMaquina(true, true); // true = modo técnico (solo estado editable)
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
    
    // Si es modo técnico (soloEstado=true), solo permitir editar el estado
    const esEstado = (id === 'editEstado');
    const puedeEditar = soloEstado ? esEstado : editando;
    
    el.readOnly = !puedeEditar;
    if (el.tagName === 'SELECT') el.disabled = !puedeEditar;
    el.style.opacity = puedeEditar ? '' : '0.65';
    el.style.cursor = puedeEditar ? '' : 'default';
  });

  // Bloquear interacción completa del body del modal en modo lectura (solo si no es técnico)
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
      // Ocultar botón de edición para técnicos
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
  
  // Mostrar mensaje informativo para técnicos
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
  
  // Si es técnico, solo permitir cambiar el estado
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

    // Poblar el select de salas si está vacío
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

// ── QR Codes ──────────────────────────────────────────────────────────────────
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
  qrUrlEl.style.textDecoration = 'underline'; // Asegurar que parezca clickeable

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

async function toggleResolucionIncidencia(id, nuevoEstado) {
  let comentario = '';
  if (nuevoEstado) {
    comentario = await customPrompt('Marcar como resuelta', 'Escribe un breve comentario sobre la solución (opcional):');
    if (comentario === null) return; // Cancelado
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
  window.currentIncidenciaId = id; // Necesario para botón Finalizar incidencia
  const isInc = sesion.tipo === 'Incidencia';
  const resuelta = sesion.resuelta || false;

  // Cambiar título del modal dinámicamente
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
        <!-- Columna Izquierda: Información Principal -->
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

        <!-- Columna Derecha: Fotos y Acciones rápidas -->
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

  // --- Manejo de Seguimientos ---
  const seccionSeg = document.getElementById('seccionSeguimiento');
  const timeline = document.getElementById('seguimientoTimeline');

  if (isInc && seccionSeg && timeline) {
    seccionSeg.style.display = 'block';
    timeline.innerHTML = '<div style="text-align:center;padding:10px;opacity:0.5">Cargando hilo de seguimiento...</div>';

    // Guardar ID actual para la nueva nota
    window.currentIncidenciaId = id;

    // Cargar seguimientos desde la API
    const segRes = await apiFetch(`/api/incidencia/${id}/seguimientos`);
    if (segRes.ok && segRes.data) {
      const notas = segRes.data;
      if (notas.length === 0) {
        timeline.innerHTML = '<div style="text-align:center;padding:10px;opacity:0.5;font-size:12px">No hay notas registradas aún.</div>';
      } else {
        timeline.classList.add('timeline-compact');
        timeline.innerHTML = notas.map((n, index) => {
          const fechaCreado = formatFechaHora(n.timestamp);
          const esPrimera = index === notas.length - 1; // La más reciente
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
        // Hacer scroll al final
        timeline.scrollTop = timeline.scrollHeight;
      }
    } else {
      timeline.innerHTML = '<div style="color:var(--danger);font-size:12px">Error al cargar el historial de seguimiento.</div>';
    }
  } else if (seccionSeg) {
    seccionSeg.style.display = 'none';
  }

  // Mostrar/ocultar botón Finalizar incidencia en el modal-footer
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
    // Recargar el detalle para ver la nueva nota
    verDetalleSesion(id);
  } else {
    showFeedback('Error al anotar', 'No se ha podido guardar la nota de seguimiento: ' + res.error, '');
  }
  btn.disabled = false;
  btn.innerHTML = '<span>Añadir Nota</span>';
}

// ── Edición de Seguimientos ─────────────────────────────────────────────────
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
  
  // Usar Supabase directamente - solo actualizar nota (sin editado_en)
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
  // Recargar el detalle
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
    // Recargar datos y refrescar vista
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

// ── Usuarios / Administradores ────────────────────────────────────────────────
let filtroRolUsuarios = 'todos'; // Filtro actual: 'todos', 'admin', 'tecnico', 'usuario', 'pendientes'

function filtrarUsuarios(rol) {
  filtroRolUsuarios = rol;
  
  // Actualizar estilos de los botones
  const botones = {
    'todos': 'btnFiltroTodos',
    'admin': 'btnFiltroAdmin',
    'tecnico': 'btnFiltroTecnico',
    'usuario': 'btnFiltroUsuario',
    'pendientes': 'btnFiltroPendientes'
  };
  
  Object.keys(botones).forEach(key => {
    const btn = document.getElementById(botones[key]);
    if (btn) {
      if (key === rol) {
        // Botón activo
        btn.style.cssText = 'background:var(--accent);color:white;padding:8px 16px;border-radius:20px;border:none;cursor:pointer;font-weight:600;font-size:13px;';
      } else {
        // Botón inactivo
        btn.style.cssText = 'padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer;font-weight:600;font-size:13px;';
      }
    }
  });
  
  renderUsuarios();
}

const ROL_BADGES = {
  admin: { label: 'Administrador', cls: 'azul' },
  tecnico: { label: 'Técnico', cls: 'verde' },
  usuario: { label: 'Usuario', cls: '' },
};

function toggleGuia(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

function toggleRolesHelp() {
  const pop = document.getElementById('rolesHelpPopover');
  if (!pop) return;
  const visible = pop.style.display !== 'none';
  pop.style.display = visible ? 'none' : 'block';
  if (!visible) {
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!pop.contains(e.target) && e.target.id !== 'btnRolesHelp') {
          pop.style.display = 'none';
        }
        document.removeEventListener('click', handler);
      });
    }, 0);
  }
}

async function renderUsuarios() {
  const container = document.getElementById('tablaUsuarios');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px"><span class="spinner" style="display:inline-block"></span> Cargando usuarios...</td></tr>';

  try {
    const client = window.supabaseClient;
    const { data: perfiles, error } = await client
      .from('perfiles')
      .select('*');

    if (error) throw error;

    if (!perfiles || !perfiles.length) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No hay usuarios registrados aún</td></tr>';
      return;
    }

    // Ordenar por roles: admin → tecnico → usuario
    const ordenRoles = { 'admin': 0, 'tecnico': 1, 'usuario': 2 };
    perfiles.sort((a, b) => {
      const ordenA = ordenRoles[a.rol] ?? 3;
      const ordenB = ordenRoles[b.rol] ?? 3;
      return ordenA - ordenB;
    });

    // Aplicar filtro por rol o estado
    let perfilesFiltrados = perfiles;
    if (filtroRolUsuarios === 'pendientes') {
      perfilesFiltrados = perfiles.filter(u => u.activo === false);
    } else if (filtroRolUsuarios !== 'todos') {
      perfilesFiltrados = perfiles.filter(u => u.rol === filtroRolUsuarios);
    }

    // Actualizar subtítulo con datos reales de la base de datos
    const elUsr = document.getElementById('subtitle-usuarios');
    if (elUsr) {
      const total = perfiles.length;
      const admins = perfiles.filter(u => u.rol === 'admin').length;
      const tecnicos = perfiles.filter(u => u.rol === 'tecnico').length;
      const pendientes = perfiles.filter(u => u.activo === false).length;
      const partes = [`${total} usuario${total !== 1 ? 's' : ''}`];
      if (admins > 0) partes.push(`${admins} admin${admins !== 1 ? 's' : ''}`);
      if (tecnicos > 0) partes.push(`${tecnicos} técnico${tecnicos !== 1 ? 's' : ''}`);
      if (pendientes > 0) partes.push(`${pendientes} pendiente${pendientes !== 1 ? 's' : ''} de alta`);
      elUsr.textContent = partes.join(' · ');
    }

    if (!perfilesFiltrados.length) {
      const mensaje = filtroRolUsuarios === 'pendientes'
        ? 'No hay usuarios pendientes de alta'
        : `No hay usuarios con el rol "${formatearRol(filtroRolUsuarios)}"`;
      container.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">${mensaje}</td></tr>`;
      return;
    }

    const session = window.sgiAdminSession || {};
    const esAdmin = session.type === 'superadmin' || session.type === 'admin';

    container.innerHTML = perfilesFiltrados.map(u => {
      const rol = u.rol ? (ROL_BADGES[u.rol] || { label: u.rol, cls: '' }) : { label: 'Sin rol', cls: '' };
      const fecha = u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-ES') : '–';
      const activo = u.activo !== false; // Default to true if not set
      const estadoBadge = activo
        ? '<span class="estado-badge ok">Activo</span>'
        : '<span class="estado-badge" style="background:#f59e0b20;color:#f59e0b">Pendiente de alta</span>';
      const altaButton = activo
        ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);padding:4px 8px" onclick="toggleAltaUsuario('${u.id}', false)" title="Dar de baja">Dar de baja</button>`
        : `<button class="btn btn-outline btn-sm" style="color:var(--success);border-color:var(--success);padding:4px 8px" onclick="toggleAltaUsuario('${u.id}', true)" title="Dar de alta">✓ Dar de alta</button>
           <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);padding:4px 8px" onclick="eliminarUsuario('${u.id}')" title="Rechazar y eliminar">✕ Rechazar</button>`;
      return `
      <tr>
        <td data-label="Nombre">
          <b>${u.nombre || '–'}</b>
          <div style="font-size:11px;color:var(--text-muted)">${u.email}</div>
          ${esAdmin ? `<button class="btn btn-text btn-sm" style="font-size:11px;padding:2px 0;color:var(--accent)" onclick="editarNombreUsuario('${u.id}','${(u.nombre || '').replace(/'/g, "\\'")}')">Editar nombre</button>` : ''}
        </td>
        <td data-label="Rol"><span class="estado-badge ${rol.cls}">${rol.label}</span></td>
        <td data-label="Estado">${estadoBadge}</td>
        <td data-label="Registro" style="font-size:11px">${fecha}</td>
        <td data-label="Acciones">
          ${esAdmin ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${altaButton}
              ${activo && u.rol !== 'admin' ? `<button class="btn btn-outline btn-sm" style="color:var(--accent);border-color:var(--accent)" onclick="cambiarRolUsuario('${u.id}','admin')">Hacer Admin</button>` : ''}
              ${activo && u.rol === 'admin' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="cambiarRolUsuario('${u.id}','usuario')">Quitar Admin</button>` : ''}
              ${activo && u.rol !== 'tecnico' ? `<button class="btn btn-outline btn-sm" style="color:var(--success);border-color:var(--success)" onclick="cambiarRolUsuario('${u.id}','tecnico')">Hacer Técnico</button>` : ''}
              ${activo && u.rol === 'tecnico' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="cambiarRolUsuario('${u.id}','usuario')">Quitar Técnico</button>` : ''}
              ${session.type === 'superadmin' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);padding:4px 8px" onclick="eliminarUsuario('${u.id}')" title="Eliminar usuario permanentemente">Eliminar</button>` : ''}
            </div>
          ` : '<span style="color:var(--text-muted);font-size:12px">Solo los administradores pueden cambiar roles</span>'}
        </td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando perfiles:', err);
    container.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--danger)">Error al cargar usuarios: ${err.message}<br><br><small>Asegúrate de haber creado la tabla <code>perfiles</code> en Supabase.</small></td></tr>`;
  }
}

async function eliminarUsuario(userId) {
  const session = window.sgiAdminSession || {};
  if (session.type !== 'superadmin') {
    showFeedback('Acceso Denegado', 'Solo el administrador principal puede eliminar usuarios.', '');
    return;
  }
  const ok = await customConfirm(
    'Eliminar Usuario',
    '¿Estás seguro de que deseas eliminar este usuario? Su perfil y accesos se borrarán del sistema. Esta acción no se puede deshacer.',
    ''
  );
  if (!ok) return;

  try {
    const client = window.supabaseClient;

    // Primero, intentamos eliminar el usuario del sistema de Auth usando una función RPC
    const { error: rpcError } = await client.rpc('eliminar_usuario_auth', { user_id: userId });

    // Luego eliminamos su perfil de la base de datos pública
    const { error } = await client.from('perfiles').delete().eq('id', userId);

    if (error && error.code !== 'PGRST116') throw error;
    if (rpcError) console.warn("No se pudo eliminar de Auth, pero sí del perfil:", rpcError);

    showFeedback('Usuario Eliminado', 'El perfil de usuario ha sido eliminado correctamente.', '');
    await recargarTodo();
    renderUsuarios();
  } catch (err) {
    showFeedback('Error', 'No se pudo eliminar el usuario: ' + err.message, '');
  }
}

async function cambiarRolUsuario(userId, nuevoRol) {
  const session = window.sgiAdminSession || {};
  // Allow both admin and superadmin to change roles
  if (session.type !== 'superadmin' && session.type !== 'admin') {
    showFeedback('Acceso Denegado', 'Solo los administradores pueden gestionar roles de usuario.', '');
    return;
  }
  const rolLabel = { admin: 'Administrador', tecnico: 'Técnico', usuario: 'Usuario' }[nuevoRol] || nuevoRol;
  const ok = await customConfirm(
    'Cambiar rol de usuario',
    `¿Confirmas el cambio de rol a "${rolLabel}"? El usuario recibirá los nuevos permisos de inmediato.`,
    ''
  );
  if (!ok) return;

  try {
    const client = window.supabaseClient;
    const { error } = await client.from('perfiles').update({ rol: nuevoRol }).eq('id', userId);
    if (error) throw error;
    await recargarTodo();
    renderUsuarios();
  } catch (err) {
    showFeedback('Error de permisos', 'No se ha podido cambiar el rol: ' + err.message, '');
  }
}

async function toggleAltaUsuario(userId, nuevoEstado) {
  const session = window.sgiAdminSession || {};
  if (session.type !== 'superadmin' && session.type !== 'admin') {
    showFeedback('Acceso Denegado', 'Solo los administradores pueden activar/desactivar usuarios.', '');
    return;
  }
  const actionLabel = nuevoEstado ? 'dar de alta' : 'dar de baja';
  const ok = await customConfirm(
    nuevoEstado ? 'Dar de alta usuario' : 'Dar de baja usuario',
    nuevoEstado
      ? '¿Confirmas que deseas dar de alta este usuario? Podrá acceder al sistema inmediatamente.'
      : '¿Confirmas que deseas dar de baja este usuario? No podrá acceder al sistema hasta que vuelvas a darlo de alta.',
    ''
  );
  if (!ok) return;

  try {
    const client = window.supabaseClient;
    // Si estamos activando, asignar rol 'usuario' si no tiene rol
    const updateData = { activo: nuevoEstado };
    if (nuevoEstado) {
      const { data: perfil } = await client.from('perfiles').select('rol').eq('id', userId).single();
      if (perfil && !perfil.rol) {
        updateData.rol = 'usuario';
      }
    }
    const { error } = await client.from('perfiles').update(updateData).eq('id', userId);
    if (error) throw error;
    await recargarTodo();
    renderUsuarios();
    showFeedback('Estado actualizado', nuevoEstado ? 'Usuario dado de alta correctamente.' : 'Usuario dado de baja correctamente.', '');
  } catch (err) {
    showFeedback('Error', 'No se pudo actualizar el estado: ' + err.message, '');
  }
}

async function editarNombreUsuario(userId, nombreActual) {
  const nuevoNombre = await customPrompt('Editar nombre', 'Introduce el nuevo nombre del usuario:', nombreActual);
  if (nuevoNombre === null) return;
  const nombreLimpio = nuevoNombre.trim();
  if (!nombreLimpio) {
    showFeedback('Nombre vacío', 'El nombre no puede estar vacío.', '');
    return;
  }
  if (nombreLimpio === nombreActual) return;

  try {
    const client = window.supabaseClient;
    // 1. Actualizar perfil
    const { error: errPerfil } = await client.from('perfiles').update({ nombre: nombreLimpio }).eq('id', userId);
    if (errPerfil) throw errPerfil;

    // 2. Si es el propio usuario logueado, actualizar localStorage para reflejar el cambio
    const session = window.sgiAdminSession || {};
    if (session.userId === userId) {
      session.nombre = nombreLimpio;
      window.sgiAdminSession = session;
      localStorage.setItem('sgi_admin_session', JSON.stringify(session));
      // Actualizar nombre visible en dropdown sin recargar
      const dropdownName = document.getElementById('dropdownUserName');
      if (dropdownName) dropdownName.textContent = nombreLimpio;
    }

    showFeedback('Nombre actualizado', 'El nombre del usuario se ha cambiado correctamente.', '');
    await recargarTodo();
    renderUsuarios();
  } catch (err) {
    showFeedback('Error', 'No se pudo actualizar el nombre: ' + err.message, '');
  }
}

// ── Utilidades de Red (Supabase Wrapper) ──────────────────────────────────────
function isAdminLoggedIn() {
  return localStorage.getItem('sgi_admin_session') !== null;
}

async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const payload = options.body;
  const client = window.supabaseClient;

  if (!isAdminLoggedIn() && url !== '/api/login-admin') {
    return { ok: false, error: 'No autorizado' };
  }

  try {
    if (url === '/api/login-admin') {
      return { ok: isAdminLoggedIn() };
    }

    if (url.includes('/api/all-data')) {
      // Carga paralela: salas, equipos, registros, perfiles. Match en JS para rendimiento.
      const [salas, equipos, registros, perfiles] = await Promise.all([
        client.from('salas').select('*').order('nombre'),
        client.from('equipos').select('*, salas(nombre)').order('nombre'),
        client.from('registros').select('*').order('timestamp', { ascending: false }).limit(500),
        client.from('perfiles').select('id, nombre, rol, email, activo')
      ]);

      if (salas.error) throw salas.error;
      if (equipos.error) throw equipos.error;
      if (registros.error) throw registros.error;

      const regs = registros.data || [];
      const perfilesMap = new Map((perfiles.data || []).map(p => [p.id, p]));
      const equiposMap = new Map((equipos.data || []).map(m => [m.id, {
        nombre: m.nombre,
        sala_nombre: m.salas ? m.salas.nombre : 'Sin sala'
      }]));

      const formattedMaquinas = (equipos.data || []).map(m => ({
        ...m,
        sala_nombre: m.salas ? m.salas.nombre : 'Sin sala'
      }));

      const porDiaMap = {}; const porMaquinaMap = {};
      regs.forEach(r => {
        if (r.timestamp) {
          const dia = r.timestamp.split('T')[0];
          porDiaMap[dia] = (porDiaMap[dia] || 0) + 1;
        }
        const maq = equiposMap.get(r.maquina_id);
        if (maq) {
          porMaquinaMap[maq.nombre] = (porMaquinaMap[maq.nombre] || 0) + 1;
        }
      });

      return {
        ok: true,
        data: {
          salas: salas.data,
          maquinas: formattedMaquinas,
          historial: regs.map(r => {
            const maq = equiposMap.get(r.maquina_id);
            const perf = perfilesMap.get(r.usuario_id);
            return {
              id: r.id,
              maquina: maq?.nombre || 'Desconocida',
              sala: maq?.sala_nombre || 'Sin sala',
              operario: perf?.nombre || 'Anónimo',
              rol: perf?.rol || 'usuario',
              iniciado_en: r.timestamp,
              completado_en: r.timestamp,
              observaciones: r.notas || '',
              tipo: r.tipo,
              resuelta: r.resuelta || false,
              en_seguimiento: r.en_seguimiento || false,
              comentario_resolucion: r.comentario_resolucion,
              fotos: r.photos || [],
              tiene_fotos: (r.photos && r.photos.length > 0)
            };
          }),
          dashboard: {
            hoy: regs.filter(r => r.timestamp && r.timestamp.startsWith(new Date().toISOString().split('T')[0])).length,
            semana: regs.filter(r => r.timestamp && new Date(r.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
            porDia: Object.entries(porDiaMap).map(([dia, total]) => ({ dia, total })).sort((a, b) => a.dia.localeCompare(b.dia)),
            porMaquina: Object.entries(porMaquinaMap).map(([nombre, total_sesiones]) => ({ nombre, total_sesiones })).sort((a, b) => b.total_sesiones - a.total_sesiones)
          }
        }
      };
    }

    if (url.includes('/api/maquinas') && method === 'POST') {
      const { data, error } = await client.from('equipos').insert(payload).select().single();
      if (error) throw error; return { ok: true, data };
    }

    if (url.includes('/api/maquina/') && !url.includes('/qr')) {
      const id = url.split('/')[3];
      if (method === 'PUT') { await client.from('equipos').update(payload).eq('id', id); return { ok: true }; }
      if (method === 'DELETE') { await client.from('equipos').delete().eq('id', id); return { ok: true }; }
    }

    if (url.includes('/api/sesion/') && method === 'DELETE') {
      const id = url.split('/')[3];
      const { error } = await client.from('registros').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    }

    if (url.includes('/api/sesion/') && url.includes('/resolver')) {
      const id = url.split('/')[3];
      const { error } = await client.from('registros').update({
        resuelta: payload.resuelta,
        comentario_resolucion: payload.comentario_resolucion
      }).eq('id', id);
      if (error) throw error;
      return { ok: true };
    }

    if (url.includes('/api/sesion/') && url.includes('/detalle')) {
      const id = url.split('/')[3];
      const { data: reg, error } = await client
        .from('registros')
        .select('*, equipos(nombre, salas(nombre)), perfiles(nombre, email, rol)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { ok: true, data: { sesion: { id: reg.id, maquina: reg.equipos?.nombre || 'Desconocida', sala: reg.equipos?.salas?.nombre || 'Sin sala', operario: reg.perfiles?.nombre || 'Anónimo', rol: reg.perfiles?.rol || 'usuario', iniciado_en: reg.timestamp, completado_en: reg.timestamp, observaciones: reg.notas || '', tipo: reg.tipo, resuelta: reg.resuelta || false, comentario_resolucion: reg.comentario_resolucion, fotos: reg.photos || [] }, items: [] } };
    }

    if (url.includes('/api/incidencia/') && url.includes('/seguimientos')) {
      const id = url.split('/')[3];
      if (method === 'GET') {
        const { data, error } = await client
          .from('seguimientos')
          .select('*, perfiles(nombre, rol)')
          .eq('incidencia_id', id)
          .order('timestamp', { ascending: true });

        if (error) {
          console.warn('Tabla seguimientos no encontrada o error:', error);
          return { ok: true, data: [] };
        }
        return { ok: true, data };
      }

      if (method === 'POST') {
        const usuario = getUsuarioActualInfo();
        const { data, error } = await client
          .from('seguimientos')
          .insert({
            incidencia_id: id,
            nota: payload.nota,
            usuario_id: usuario.id,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();

        // Actualizar automáticamente a "en seguimiento" si no estaba resuelta
        await client.from('registros').update({ en_seguimiento: true }).eq('id', id);

        if (error) throw error;
        return { ok: true, data };
      }
    }

    if (url.includes('/api/incidencia/') && url.includes('/editar')) {
      const id = url.split('/')[3];
      const { error } = await client.from('registros').update({ notas: payload.notas }).eq('id', id);
      if (error) throw error;
      return { ok: true };
    }

    return { ok: false, error: 'Endpoint not implemented' };
  } catch (err) {
    console.error('Error apiFetch:', err);
    // Errores de columna faltante ya no aplican con esquema normalizado
    return { ok: false, error: err.message };
  }
}

async function intentarLogin() {
  const usernameInput = document.getElementById('adminUsernameInput');
  const passwordInput = document.getElementById('adminPinInput');
  const errorEl = document.getElementById('loginError');
  const card = document.getElementById('loginCard');
  const btn = document.getElementById('btnLoginAdmin');

  const username = (usernameInput?.value || '').trim();
  const password = (passwordInput?.value || '').trim();

  if (!username || !password) {
    errorEl.innerHTML = 'Introduce usuario y contraseña.';
    return;
  }

  errorEl.innerHTML = 'Verificando...';
  if (btn) btn.disabled = true;

  // Supabase Auth + verificar rol admin en tabla perfiles
  try {
    const client = window.supabaseClient;
    if (!client) throw new Error('Sin conexión al servidor');

    const { data, error } = await client.auth.signInWithPassword({
      email: username,
      password: password
    });
    if (error) throw error;

    let perfil = null;
    try {
      const { data: p } = await client.from('perfiles').select('*').eq('id', data.user.id).single();
      perfil = p;
    } catch (e) { console.warn('Perfil no encontrado:', e.message); }

    const rol = perfil?.rol || 'usuario';
    if (rol !== 'admin' && rol !== 'tecnico') {
      await client.auth.signOut();
      throw new Error('No tienes permisos de administrador o técnico.');
    }

    localStorage.setItem('sgi_admin_session', JSON.stringify({
      type: rol,
      userId: data.user.id,
      email: data.user.email,
      nombre: perfil?.nombre || data.user.email
    }));
    localStorage.removeItem('admin_pin');
    const pendingMaquinaIdLogin = localStorage.getItem('sgi_pending_maquinaId');
    if (pendingMaquinaIdLogin) {
      localStorage.removeItem('sgi_pending_maquinaId');
      window.location.href = `operario.html?maquinaId=${pendingMaquinaIdLogin}`;
    } else {
      location.reload();
    }

  } catch (err) {
    console.error('Login error:', err);
    const msg = err.message?.includes('permisos') ? `${err.message}` : 'Credenciales incorrectas.';
    errorEl.innerHTML = msg;
    card?.classList.add('shake');
    setTimeout(() => card?.classList.remove('shake'), 400);
    if (btn) btn.disabled = false;
  }
}

function toggleAccountMenu() {
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

document.addEventListener('click', function(e) {
  const btn = document.getElementById('accountBtn');
  const dropdown = document.getElementById('accountDropdown');
  if (btn && dropdown && !btn.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

function cerrarSesionAdmin() {
  const pendingMaquinaId = localStorage.getItem('sgi_pending_maquinaId');
  localStorage.removeItem('sgi_admin_session');
  localStorage.removeItem('sgi_user_session');
  localStorage.removeItem('admin_pin');
  if (pendingMaquinaId) localStorage.setItem('sgi_pending_maquinaId', pendingMaquinaId);
  if (window.supabaseClient) window.supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}
function abrirModal(id) { document.getElementById(id)?.classList.add('open'); }
function cerrarModal(id) { document.getElementById(id)?.classList.remove('open'); }
function abrirLightbox(src) {
  const existing = document.getElementById('lightbox-overlay');
  if (existing) existing.remove();

  // Outer overlay (never scrolls)
  const lb = document.createElement('div');
  lb.id = 'lightbox-overlay';
  lb.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;cursor:default';

  // Inner scrollable viewport (only this scrolls)
  const viewport = document.createElement('div');
  viewport.id = 'lightbox-viewport';
  viewport.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;box-sizing:border-box';

  // Inject wider scrollbar style scoped to this viewport
  const scrollStyle = document.createElement('style');
  scrollStyle.id = 'lightbox-scrollbar-style';
  scrollStyle.textContent = `
    #lightbox-viewport::-webkit-scrollbar { width: 12px; height: 12px; }
    #lightbox-viewport::-webkit-scrollbar-track { background: rgba(255,255,255,0.08); border-radius: 6px; }
    #lightbox-viewport::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.45); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    #lightbox-viewport::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.7); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    #lightbox-viewport { scrollbar-width: auto; scrollbar-color: rgba(255,255,255,0.45) rgba(255,255,255,0.08); }
  `;
  document.head.appendChild(scrollStyle);

  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'display:block;max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in';

  viewport.appendChild(img);

  // Bottom bar with controls
  const bar = document.createElement('div');
  bar.style.cssText = 'flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,0.7);padding:10px 16px';

  function mkBtn(html, title) {
    const b = document.createElement('button');
    b.innerHTML = html;
    b.title = title;
    b.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;font-size:18px;cursor:pointer;line-height:1';
    return b;
  }

  const btnZoomIn  = mkBtn('+', 'Ampliar');
  const btnZoomOut = mkBtn('−', 'Reducir');
  const btnClose   = document.createElement('button');
  btnClose.innerHTML = '✕&nbsp;Cerrar';
  btnClose.style.cssText = 'background:#fff;border:none;color:#111;border-radius:8px;padding:7px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin-left:8px';

  bar.appendChild(btnZoomOut);
  bar.appendChild(btnZoomIn);
  bar.appendChild(btnClose);

  lb.appendChild(viewport);
  lb.appendChild(bar);
  document.body.appendChild(lb);

  let scale = 1;
  const FIT = 1; // we'll set to fitScale after load

  function fitScale() {
    return Math.min(1,
      viewport.clientWidth  / img.naturalWidth,
      viewport.clientHeight / img.naturalHeight
    );
  }

  function applyZoom(newScale, focalX, focalY) {
    const oldScale = scale;
    scale = Math.max(fitScale() * 0.9, Math.min(8, newScale));
    const w = Math.round(img.naturalWidth  * scale);
    const h = Math.round(img.naturalHeight * scale);

    if (scale <= fitScale() * 1.01) {
      // Fit mode: centered, no scroll
      viewport.style.overflow       = 'hidden';
      viewport.style.alignItems     = 'center';
      viewport.style.justifyContent = 'center';
      img.style.width     = '';
      img.style.height    = '';
      img.style.maxWidth  = '100%';
      img.style.maxHeight = '100%';
      img.style.margin    = '';
      img.style.cursor    = 'zoom-in';
    } else {
      // Zoomed mode: scrollable
      const wasZoomed = oldScale > fitScale() * 1.01;

      // Capture focal ratio BEFORE resize
      let ratioX = 0.5, ratioY = 0.5;
      if (wasZoomed && focalX !== undefined) {
        // focal is in viewport client coords
        const cx = focalX - viewport.getBoundingClientRect().left;
        const cy = focalY - viewport.getBoundingClientRect().top;
        const totalW = img.naturalWidth  * oldScale;
        const totalH = img.naturalHeight * oldScale;
        const marginX = Math.max(0, (viewport.clientWidth  - totalW) / 2);
        const marginY = Math.max(0, (viewport.clientHeight - totalH) / 2);
        ratioX = (viewport.scrollLeft + cx - marginX) / totalW;
        ratioY = (viewport.scrollTop  + cy - marginY) / totalH;
      } else if (!wasZoomed) {
        // Coming from fit: keep center
        ratioX = 0.5; ratioY = 0.5;
      } else {
        // No focal: keep current center of viewport
        const totalW = img.naturalWidth  * oldScale;
        const totalH = img.naturalHeight * oldScale;
        const marginX = Math.max(0, (viewport.clientWidth  - totalW) / 2);
        const marginY = Math.max(0, (viewport.clientHeight - totalH) / 2);
        ratioX = (viewport.scrollLeft + viewport.clientWidth  / 2 - marginX) / totalW;
        ratioY = (viewport.scrollTop  + viewport.clientHeight / 2 - marginY) / totalH;
      }

      viewport.style.overflow       = 'auto';
      viewport.style.alignItems     = 'flex-start';
      viewport.style.justifyContent = 'flex-start';
      img.style.maxWidth  = 'none';
      img.style.maxHeight = 'none';
      img.style.width     = w + 'px';
      img.style.height    = h + 'px';
      img.style.margin    = '0 auto';
      img.style.cursor    = 'zoom-out';

      requestAnimationFrame(() => {
        const newMarginX = Math.max(0, (viewport.clientWidth  - w) / 2);
        const newMarginY = Math.max(0, (viewport.clientHeight - h) / 2);
        const cx = focalX !== undefined ? focalX - viewport.getBoundingClientRect().left : viewport.clientWidth  / 2;
        const cy = focalY !== undefined ? focalY - viewport.getBoundingClientRect().top  : viewport.clientHeight / 2;
        viewport.scrollLeft = newMarginX + ratioX * w - cx;
        viewport.scrollTop  = newMarginY + ratioY * h - cy;
      });
    }
  }

  img.addEventListener('load', () => applyZoom(fitScale()), { once: true });
  if (img.complete && img.naturalWidth) applyZoom(fitScale());

  // Click image: toggle fit ↔ 100%
  img.addEventListener('click', e => {
    e.stopPropagation();
    applyZoom(scale <= fitScale() * 1.01 ? 1 : fitScale(), e.clientX, e.clientY);
  });

  btnZoomIn.addEventListener('click',  e => { e.stopPropagation(); applyZoom(scale * 1.5); });
  btnZoomOut.addEventListener('click', e => { e.stopPropagation(); applyZoom(scale / 1.5); });
  btnClose.addEventListener('click', closeLb);

  lb.addEventListener('click', e => { if (e.target === lb || e.target === viewport) closeLb(); });

  function escHandler(e) { if (e.key === 'Escape') closeLb(); }
  document.addEventListener('keydown', escHandler);

  function closeLb() {
    lb.remove();
    document.getElementById('lightbox-scrollbar-style')?.remove();
    document.removeEventListener('keydown', escHandler);
  }
}

function formatFechaHora(str) { if (!str) return '–'; const d = new Date(str); return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }

function formatFechaDia(str) { if (!str) return '–'; const [y, m, d] = str.split('-'); return `${d}/${m}`; }
function truncate(str, len) { return str.length > len ? str.slice(0, len) + '…' : str; }
function escapar(str) { return String(str).replace(/'/g, "\\'"); }
async function recargarTodo() { await cargarDatosBase(); }

document.querySelectorAll('.overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }));

function iniciarTour() {
  const driverInstance = window.driver?.js?.driver || window.driver;
  if (!driverInstance) return;

  const refresco = (ms = 250) => setTimeout(() => { if (driverObj.refresh) driverObj.refresh(); }, ms);

  const driverObj = driverInstance({
    showProgress: true,
    animate: false,
    smoothScroll: false,
    popoverClass: 'driverjs-theme',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Atrás',
    doneBtnText: 'Finalizar ✓',
    progressText: '{{current}} de {{total}}',
    steps: [
      /* ── 1. Bienvenida ─────────────────────────────────────────────── */
      {
        popover: {
          title: 'Bienvenido al Sistema de Gestión',
          description: 'Este recorrido te explicará cómo funciona el sistema antes de mostrarte cada sección. Usa los botones para avanzar.'
        },
        onHighlightStarted: () => navigateTo('dashboard')
      },
      /* ── 2. Las dos páginas principales ────────────────────────────── */
      {
        popover: {
          title: 'Las dos páginas del sistema',
          description: '<strong>Panel de Administración</strong> (aquí): gestión interna completa — incidencias, máquinas, usuarios y QRs.<br><br><strong>Estado de Equipos</strong> (página pública): vista en tiempo real del estado de todas las máquinas, pensada para mostrarse en pantallas o consultarse rápidamente sin necesidad de iniciar sesión.'
        }
      },
      /* ── 3. Estados de incidencia ───────────────────────────────────── */
      {
        popover: {
          title: 'Estados de una Incidencia',
          description: '<strong style="color:#dc2626">● Sin resolver</strong> — el usuario ha reportado el problema y aún no se ha atendido.<br><br><strong style="color:#d97706">● En seguimiento</strong> — un técnico o admin está trabajando en ello y ha dejado notas de progreso.<br><br><strong style="color:#16a34a">● Resuelta</strong> — la incidencia ha sido cerrada y la máquina vuelve a estar operativa.'
        }
      },
      /* ── 4. Estados de máquina ──────────────────────────────────────── */
      {
        popover: {
          title: 'Estados de una Máquina',
          description: '<strong style="color:#16a34a">● Activa</strong> — la máquina está operativa y disponible para su uso.<br><br><strong style="color:#6b7280">● Inactiva</strong> — la máquina está desconectada, retirada o fuera de servicio de forma indefinida. No aparece como disponible en el portal de reportes.'
        }
      },
      /* ── 5. Roles de usuario ────────────────────────────────────────── */
      {
        popover: {
          title: 'Roles de Usuario',
          description: '<strong style="color:#dc2626">Usuario</strong> — solo puede reportar incidencias desde el portal de reportes. Sin acceso al panel.<br><br><strong style="color:#16a34a">Técnico</strong> — accede al panel para ver máquinas e incidencias, añadir notas de seguimiento y cambiar el estado operativo de una máquina (activa/inactiva). No puede crear máquinas ni gestionar usuarios.<br><br><strong style="color:#3b82f6">Administrador</strong> — acceso completo: gestiona máquinas, salas, usuarios y toda la configuración del sistema.'
        }
      },
      /* ── 2-4. Resumen (Dashboard) ───────────────────────────────────── */
      {
        element: '#kpiGrid',
        popover: {
          title: 'Resumen General',
          description: 'De un vistazo ves las incidencias pendientes y en seguimiento, y el estado de las máquinas activas e inactivas en tiempo real.'
        },
        onHighlightStarted: () => refresco()
      },
      {
        element: '#dashboardIncPendientes',
        popover: {
          title: 'Incidencias Recientes',
          description: 'Lista de las últimas incidencias sin resolver. Haz clic en "Gestionar" para ver el detalle, añadir notas de seguimiento o marcarla como resuelta.'
        }
      },
      {
        element: '#dashboardMaqInactivas',
        popover: {
          title: 'Máquinas Inactivas',
          description: 'Listado rápido de las máquinas que están marcadas como inactivas. Haz clic en cualquiera de ellas para ir directo a su ficha.'
        }
      },
      /* ── 5. Nav → Incidencias (navegamos aquí para que la sección esté lista en el siguiente paso) */
      {
        element: '#nav-incidencias',
        popover: {
          title: 'Sección: Incidencias',
          description: 'Desde aquí accedes al panel completo de incidencias. Haz clic para abrir la sección en cualquier momento.'
        },
        onHighlightStarted: () => navigateTo('incidencias')
      },
      /* ── 6-7. Incidencias ───────────────────────────────────────────── */
      {
        element: '#kpi-inc-pendientes-card',
        popover: {
          title: 'Estadísticas de Incidencias',
          description: 'Totales de incidencias sin resolver, en seguimiento y resueltas. Los colores cambian según la urgencia del estado.'
        },
        onHighlightStarted: () => refresco()
      },
      {
        element: '#gridTicketsIncidencias',
        popover: {
          title: 'Listado de Incidencias',
          description: 'Todas las incidencias del sistema. Filtra por estado (sin resolver, seguimiento, resueltas), ordena por fecha o máquina, y exporta a CSV con el botón superior.'
        }
      },
      /* ── 8. Nav → Máquinas ──────────────────────────────────────────── */
      {
        element: '#nav-maquinas',
        popover: {
          title: 'Sección: Máquinas y Salas',
          description: 'Gestiona el inventario completo de máquinas e impresoras, agrupadas por salas.'
        },
        onHighlightStarted: () => navigateTo('maquinas')
      },
      /* ── 9-11. Máquinas ─────────────────────────────────────────────── */
      {
        element: '#gridMaquinas',
        popover: {
          title: 'Inventario de Máquinas',
          description: 'Cada tarjeta es una máquina. El color del borde indica su estado: verde (operativa), rojo (con incidencia), amarillo (en seguimiento), gris (inactiva). Haz clic para ver historial y editar.'
        },
        onHighlightStarted: () => refresco()
      },
      {
        element: '#btnNuevaMaquina',
        popover: {
          title: 'Añadir Máquina',
          description: 'Crea una nueva máquina indicando nombre, sala, tipo, modelo y estado operativo inicial.'
        }
      },
      {
        element: '#btnGestionarSalas',
        popover: {
          title: 'Gestionar Salas',
          description: 'Crea, renombra o elimina las salas del sistema. Cada máquina debe estar asignada a una sala.'
        }
      },
      /* ── 12. Nav → QR ───────────────────────────────────────────────── */
      {
        element: '#nav-qrcodes',
        popover: {
          title: 'Sección: Códigos QR',
          description: 'Genera QRs individuales por máquina para que los usuarios reporten incidencias escaneando desde el móvil.'
        },
        onHighlightStarted: () => navigateTo('qrcodes')
      },
      /* ── 13. QR Codes ───────────────────────────────────────────────── */
      {
        element: '#gridQRs',
        popover: {
          title: 'QRs de Máquinas',
          description: 'Cada máquina tiene su propio QR único. Imprímelos y colócalos físicamente junto al equipo. Al escanear, la máquina queda preseleccionada en el formulario de reporte del usuario.'
        },
        onHighlightStarted: () => refresco()
      },
      /* ── 14-15. Usuarios (solo admins) ─────────────────────────────── */
      ...(rolActual !== 'tecnico' ? [
        {
          element: '#nav-usuarios',
          popover: {
            title: 'Sección: Usuarios',
            description: 'Gestiona las cuentas del sistema y sus roles: Usuario (solo reporta), Técnico (acceso al panel, sin editar) y Administrador (acceso completo).'
          },
          onHighlightStarted: () => navigateTo('usuarios')
        },
        {
          element: '#tablaUsuarios',
          popover: {
            title: 'Gestión de Usuarios',
            description: 'Todos los usuarios registrados, con su rol y estado. Puedes cambiar roles, activar o desactivar cuentas. Los usuarios nuevos se registran desde el portal y tú asignas su nivel de acceso.'
          },
          onHighlightStarted: () => refresco()
        }
      ] : []),
      /* ── Último paso ────────────────────────────────────────────────── */
      {
        element: '#btnThemeToggle',
        popover: {
          title: 'Tema Oscuro / Claro',
          description: 'Cambia el tema visual del panel según tus preferencias. La elección se guarda automáticamente en tu navegador.'
        }
      }
    ]
  });

  driverObj.drive();
}

// ── Gestión de Salas ────────────────────────────────────────────────────────
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

function renderSelectTipos(selectId, valorSeleccionado = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const tipos = [...new Set(datosMaquinas.map(m => m.tipo).filter(Boolean))].sort();
  const tiposBase = ['Impresora FDM', 'Impresora Resina', 'CNC / Fresadora', 'Cortadora Láser'];
  let todos = [...new Set([...tiposBase, ...tipos])];

  // Si el valor seleccionado no está en la lista, añadirlo para evitar perder datos
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
  // Opción para añadir nuevo tipo
  const addOpt = document.createElement('option');
  addOpt.value = '__NUEVO__';
  addOpt.textContent = '➕ Añadir otro tipo...';
  sel.appendChild(addOpt);
  // Opción para eliminar tipo
  const delOpt = document.createElement('option');
  delOpt.value = '__ELIMINAR__';
  delOpt.textContent = '🗑️ Eliminar un tipo...';
  sel.appendChild(delOpt);
  // Seleccionar el valor actual si existe (coincidencia exacta o case-insensitive)
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

  // Buscar si ya existe (ignorando mayúsculas/minúsculas)
  const existente = Array.from(sel.options).find(o => o.value !== '__NUEVO__' && o.value !== '__ELIMINAR__' && o.value.toLowerCase() === nombreLower);
  if (existente) {
    sel.value = existente.value;
    showFeedback('Tipo existente', `El tipo "${existente.value}" ya existe y ha sido seleccionado.`, '');
    return;
  }

  // Insertar ordenadamente antes de "Añadir otro tipo"
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

  // Construir lista de tipos eliminables para mostrar en el prompt
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

  // Eliminar la opción de todos los selects de tipo activos en el DOM
  ['nuevoMaquinaTipo', 'editTipo'].forEach(id => {
    const s = document.getElementById(id);
    if (!s) return;
    const opt = Array.from(s.options).find(o => o.value.toLowerCase() === optAEliminar.value.toLowerCase());
    if (opt) s.removeChild(opt);
    if (s.value === optAEliminar.value || s.value === '') s.value = primerTipoValido(s);
  });

  showFeedback('Tipo eliminado', `El tipo "${optAEliminar.value}" ha sido eliminado de la lista.`, '🗑️');
}

// ── Helpers de UI (Nuevos) ───────────────────────────────────────────────────
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
