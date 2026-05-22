'use strict';

// ── Estado global ─────────────────────────────────────────────────────────────
let maquinaId = null;
let maquinaData = null;
let sesionId = null;
let modoActual = 'Incidencia';
let selectedPhotos = [];
let incidenciaAbiertaId = null; // ID de incidencia abierta para seguimiento

// ── Arranque ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  maquinaId = urlParams.get('maquinaId'); // Corrección: quitar 'const' para usar global
  console.log("ID de máquina recibido de la URL:", maquinaId);

  if (!maquinaId) {
    showError('No se especificó ninguna máquina en la URL. Escanea el código QR de nuevo.');
    return;
  }

  try {
    const client = window.supabaseClient;
    console.log("Buscando máquina en Supabase con criterio:", maquinaId);

    // Búsqueda ESTRICTA solo por ID (UUID)
    let { data: maquina, error: mError } = await client
      .from('equipos')
      .select('*, salas(nombre)')
      .eq('id', maquinaId)
      .maybeSingle();

    if (mError && !maquina) {
      console.error("Error inicial de Supabase:", mError);
    }

    if (!maquina) {
      console.warn("No se encontró ninguna coincidencia para:", maquinaId);
      showError('No existe ninguna impresora con el ID o Nombre: "' + maquinaId + '". Verifica que esté registrada en el Panel de Administrador.');
      return;
    }

    console.log("Máquina cargada con éxito:", maquina);

    // Asignar datos de la máquina al estado global
    maquinaData = {
      ...maquina,
      id: maquina.id,
      sala_nombre: maquina.salas ? maquina.salas.nombre : 'Sin sala'
    };
    maquinaId = maquinaData.id;

    // --- VERIFICACIÓN DE SEMÁFORO (INCIDENCIAS ABIERTAS) ---
    console.log('🔍 Verificando incidencias para máquina:', maquinaId);
    
    // Consulta simplificada para evitar errores de columnas que no existan
    let openInc = [];
    let incError = null;
    try {
      const result = await client
        .from('registros')
        .select('*')
        .eq('maquina_id', maquinaId)
        .eq('tipo', 'Incidencia')
        .order('timestamp', { ascending: false });
      
      if (result.error) {
        incError = result.error;
        console.error('❌ Error consulta:', result.error);
      } else {
        // Filtrar manualmente las no resueltas (por si el campo tiene otro nombre)
        openInc = result.data ? result.data.filter(r => !r.resuelta && !r.fecha_resolucion) : [];
      }
    } catch (e) {
      incError = e;
      console.error('❌ Excepción:', e);
    }

    console.log('📊 Resultado incidencias:', { count: openInc?.length || 0, error: incError?.message });

    const banner = document.getElementById('statusBanner');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');
    const incCard = document.querySelector('.portal-card.incident');

    if (openInc && openInc.length > 0) {
      incidenciaAbiertaId = openInc[0].id;
      banner.className = 'status-banner status-repair';
      icon.textContent = '🔴';
      text.textContent = 'Máquina en Reparación / Parada';

      // Mostrar banner informativo sin bloquear creación de nueva incidencia
      const incBanner = document.getElementById('incidenciaActivaBanner');
      const incBannerLabel = document.getElementById('incBannerLabel');
      const incBannerDesc = document.getElementById('incBannerDesc');
      if (incBanner) {
        incBanner.style.display = 'block';
        if (openInc.length > 1) {
          if (incBannerLabel) incBannerLabel.textContent = `⚠️ ${openInc.length} incidencias activas`;
          const desc = openInc[0].notas ? openInc[0].notas.slice(0, 80) + (openInc[0].notas.length > 80 ? '…' : '') : 'Sin descripción';
          if (incBannerDesc) incBannerDesc.textContent = `Más reciente: "${desc}"`;
        } else {
          if (incBannerLabel) incBannerLabel.textContent = '⚠️ Incidencia activa';
          const desc = openInc[0].notas ? openInc[0].notas.slice(0, 80) + (openInc[0].notas.length > 80 ? '…' : '') : 'Sin descripción';
          if (incBannerDesc) incBannerDesc.textContent = `"${desc}"`;
        }
      }
    } else {
      incidenciaAbiertaId = null;
      banner.className = 'status-banner status-operative';
      icon.textContent = '🟢';
      text.textContent = 'Máquina Activa';
    }

    const pNm = document.getElementById('portalMaquinaNombre');
    const pSl = document.getElementById('portalMaquinaSala');
    if (pNm) pNm.textContent = maquinaData.nombre;
    if (pSl) pSl.textContent = maquinaData.sala_nombre;

    showScreen('portal');
  } catch (e) {
    showError('Error de conexión con el servidor: ' + e.message);
  }
});

// ── Navegación ────────────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  
  // Si mostramos la pantalla de seguimiento, cargar datos
  if (name === 'incidencia-seguimiento') {
    document.getElementById('segIncMaquinaNombre').textContent = maquinaData?.nombre || 'Incidencia';
    document.getElementById('segIncSalaNombre').textContent = maquinaData?.sala_nombre || '';
    cargarSeguimientoIncidencia();
  }
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showScreen('error');
}

function seleccionarModo(modo) {
  modoActual = 'Incidencia';
  iniciarSesion();
}

function setOpTipo(tipo) {
  modoActual = 'Incidencia';
  const iCard = document.getElementById('op-tipo-inc');
  if (iCard) iCard.classList.add('active-inc');
}

// ── Reporte ───────────────────────────────────────────────────────────────────
async function iniciarSesion() {
  const res = await apiFetch('/api/sesion/iniciar', {
    method: 'POST',
    body: { maquina_id: maquinaId }, // Ya no necesitamos operario_id aquí
  });

  if (res.ok) {
    sesionId = res.data.sesion_id;

    // Actualizar nombres en la UI de checklist
    document.getElementById('checkMaquinaNombre').textContent = maquinaData.nombre;
    document.getElementById('checkSalaNombre').textContent = maquinaData.sala_nombre;

    document.getElementById('reporteTextarea').value = '';
    document.getElementById('reporteError').style.display = 'none';
    actualizarBoton('');

    showScreen('checklist');
  } else {
    showError('Error al iniciar reporte');
  }
}

// ── Reporte ───────────────────────────────────────────────────────────────────
function onReporteChange() {
  const texto = document.getElementById('reporteTextarea').value;
  document.getElementById('reporteError').style.display = 'none';
  actualizarBoton(texto);
}

function actualizarBoton(texto) {
  const btn = document.getElementById('btnEnviar');
  const isValid = texto.trim().length > 0;

  if (isValid) {
    btn.className = 'btn-enviar activo';
    btn.textContent = '✅ Enviar informe';
    btn.disabled = false;
  } else {
    btn.className = 'btn-enviar bloqueado';
    btn.textContent = '✏️ Rellena el reporte para continuar';
    btn.disabled = true;
  }
}

// ── Gestión de Fotos ─────────────────────────────────────────────────────────
const MAX_PHOTOS = 5;
const MAX_PHOTO_DIMENSION = 1200;
const PHOTO_QUALITY = 0.82;

function comprimirImagen(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_PHOTO_DIMENSION) / width);
          width = MAX_PHOTO_DIMENSION;
        } else {
          width = Math.round((width * MAX_PHOTO_DIMENSION) / height);
          height = MAX_PHOTO_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
    };
    img.src = dataUrl;
  });
}

function onPhotoSelected() {
  const file = document.getElementById('photoInput').files[0];
  if (!file) return;

  if (selectedPhotos.length >= MAX_PHOTOS) {
    alert(`Solo puedes adjuntar un máximo de ${MAX_PHOTOS} fotos por reporte.`);
    document.getElementById('photoInput').value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const comprimida = await comprimirImagen(e.target.result);
    selectedPhotos.push(comprimida);
    renderPhotoPreviews();
  };
  reader.readAsDataURL(file);
  document.getElementById('photoInput').value = '';
}

function renderPhotoPreviews() {
  const grid = document.getElementById('photoPreviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  selectedPhotos.forEach((src, index) => {
    const container = document.createElement('div');
    container.style = "position:relative; width:80px; height:80px; flex-shrink:0";
    container.innerHTML = `
      <img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:12px; border:2px solid var(--accent-maint)">
      <div onclick="removePhoto(${index})" style="position:absolute; top:-8px; right:-8px; background:var(--accent-inc); color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer; border:2px solid #0f0f1a">✕</div>
    `;
    grid.appendChild(container);
  });

  const text = document.getElementById('photoText');
  const icon = document.getElementById('photoIcon');
  const btn = document.getElementById('btnAddPhoto');
  const limitada = selectedPhotos.length >= MAX_PHOTOS;

  if (limitada) {
    text.textContent = `Límite alcanzado (${MAX_PHOTOS}/${MAX_PHOTOS})`;
    icon.textContent = '🚫';
    if (btn) btn.disabled = true;
  } else if (selectedPhotos.length > 0) {
    text.textContent = `Añadir otra foto (${selectedPhotos.length}/${MAX_PHOTOS})`;
    icon.textContent = '📸';
    if (btn) btn.disabled = false;
  } else {
    text.textContent = `Añadir foto de evidencia (máx. ${MAX_PHOTOS})`;
    icon.textContent = '📷';
    if (btn) btn.disabled = false;
  }
}

function removePhoto(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreviews();
}

function cancelPhoto() {
  selectedPhotos = [];
  document.getElementById('photoInput').value = '';
  renderPhotoPreviews();
}

// Obtener usuario actual desde la sesión
function getCurrentUser() {
  try {
    const sessionStr = localStorage.getItem('sgi_user_session');
    const adminSessionStr = localStorage.getItem('sgi_admin_session');
    
    if (!sessionStr && !adminSessionStr) {
      return null;
    }
    
    let session = null;
    if (sessionStr) {
      session = JSON.parse(sessionStr);
    } else if (adminSessionStr) {
      session = JSON.parse(adminSessionStr);
    }
    
    return {
      id: session.userId || session.id || null,
      nombre: session.nombre || session.username || 'Usuario',
      email: session.email || ''
    };
  } catch (err) {
    console.error('Error obteniendo usuario de sesión:', err);
    return null;
  }
}

async function enviarChecklist() {
  const currentUser = getCurrentUser();
  
  if (!currentUser || !currentUser.id) {
    alert("Debes iniciar sesión para enviar un reporte.");
    window.location.href = 'index.html';
    return;
  }
  
  const nombreUser = currentUser.nombre;
  const reporte = document.getElementById('reporteTextarea').value.trim();

  if (reporte.length < 1) {
    document.getElementById('reporteError').style.display = 'block';
    return;
  }

  const btn = document.getElementById('btnEnviar');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando reporte...';

  const res = await apiFetch(`/api/sesion/${sesionId}/completar`, {
    method: 'POST',
    body: {
      observaciones: reporte,
      usuario_id: currentUser.id,
      nombre_usuario: nombreUser,
      fotos: selectedPhotos
    },
  });

  if (res.ok) {
    document.getElementById('exitoMaquina').textContent = maquinaData.nombre;
    document.getElementById('exitoOperario').textContent = nombreUser;
    document.getElementById('exitoFecha').textContent = new Date().toLocaleString('es-ES');
    showScreen('exito');
  } else {
    btn.disabled = false;
    btn.className = 'btn-enviar activo';
    btn.textContent = 'Error al enviar. Reintentar';
    alert('Error: ' + (res.error || 'No se pudo enviar el informe'));
  }
}

function reiniciar() {
  window.location.href = 'estado.html';
}

async function handlePhotoUploads(base64Photos) {
  const client = window.supabaseClient;
  const urls = [];
  console.log(`Iniciando subida de ${base64Photos.length} fotos a Storage...`);

  for (let i = 0; i < base64Photos.length; i++) {
    try {
      const b64 = base64Photos[i];
      const blob = await (await fetch(b64)).blob();
      const fileName = `${Date.now()}_${i}.jpg`;

      const { data, error } = await client.storage
        .from('photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) {
        console.error('Error al subir foto a Supabase:', error);
        continue;
      }

      const { data: { publicUrl } } = client.storage.from('photos').getPublicUrl(data.path);
      urls.push(publicUrl);
    } catch (e) {
      console.error('Fallo técnico en la subida:', e);
    }
  }
  return urls;
}

// --- SUPABASE WRAPPER FOR CHECKLIST ---
async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const payload = options.body;
  const client = window.supabaseClient;

  try {
    if (url.includes('/api/maquina/') && method === 'GET') {
      const id = url.split('/')[3];
      const { data, error } = await client
        .from('equipos')
        .select('*, salas(nombre)')
        .eq('id', id)
        .single();

      if (error) throw error;
      const formatted = {
        ...data,
        sala_nombre: data.salas ? data.salas.nombre : 'Sin sala'
      };
      return { ok: true, data: formatted };
    }

    if (url.includes('/api/sesion/iniciar')) {
      // For Supabase, we don't strictly need to start a session in a separate table
      // unless we want to track working time. For now, matching the dummy logic.
      return { ok: true, data: { sesion_id: 'temp_sesion' } };
    }

    if (url.includes('/api/sesion/') && url.includes('/completar')) {
      // 1. Upload photos to Supabase Storage if any
      let photoUrls = [];
      if (payload.fotos && payload.fotos.length > 0) {
        photoUrls = await handlePhotoUploads(payload.fotos);
      }

      // 2. Guardar registro con solo IDs (nombres se obtienen por JOIN)
      const registroPayload = {
        maquina_id: maquinaId,
        usuario_id: payload.usuario_id,
        tipo: modoActual,
        notas: payload.observaciones,
        photos: photoUrls,
        timestamp: new Date().toISOString()
      };

      const { data: registro, error: rError } = await client
        .from('registros')
        .insert(registroPayload)
        .select()
        .single();

      if (rError) throw rError;

      // Al reportar incidencia, asegurar que la máquina esté activa
      if (modoActual === 'Incidencia') {
        await client
          .from('equipos')
          .update({ estado: 'activa' })
          .eq('id', maquinaId);
      }

      return { ok: true, data: registro };
    }

    return { ok: false, error: 'Endpoint not implemented' };
  } catch (err) {
    console.error('🔴 Error apiFetch (Checklist):', err);
    // Errores de columna faltante ya no aplican con esquema normalizado
    return { ok: false, error: err.message };
  }
}

// ── Cambiar Estado de Máquina ────────────────────────────────────────────────
async function cargarEstadoMaquina() {
  if (!maquinaId) return;
  
  const client = window.supabaseClient;
  const { data: maq, error } = await client
    .from('equipos')
    .select('estado')
    .eq('id', maquinaId)
    .single();
    
  if (error) {
    console.error('Error cargando estado:', error);
    return;
  }
  
  const estado = maq.estado || 'activa';
  const btnActiva = document.getElementById('btnEstadoActiva');
  const btnInactiva = document.getElementById('btnEstadoInactiva');
  const msg = document.getElementById('estadoMaquinaMsg');
  
  if (estado === 'activa') {
    btnActiva.style.opacity = '1';
    btnActiva.style.borderWidth = '3px';
    btnInactiva.style.opacity = '0.5';
    btnInactiva.style.borderWidth = '1px';
    msg.textContent = 'La máquina está activa';
  } else {
    btnActiva.style.opacity = '0.5';
    btnActiva.style.borderWidth = '1px';
    btnInactiva.style.opacity = '1';
    btnInactiva.style.borderWidth = '3px';
    msg.textContent = 'La máquina está inactiva';
  }
}

// ── Notificación Toast ────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'};
    color: white;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: fadeInDown 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOutUp 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

async function cambiarEstadoMaquina(nuevoEstado) {
  if (!maquinaId) return;
  
  // Verificar si es técnico o admin
  const sessionStr = localStorage.getItem('sgi_user_session') || localStorage.getItem('sgi_admin_session');
  if (!sessionStr) {
    showToast('Debes iniciar sesión para cambiar el estado', 'error');
    return;
  }
  
  try {
    const session = JSON.parse(sessionStr);
    const rol = session.rol || session.type;
    if (rol !== 'tecnico' && rol !== 'admin' && rol !== 'superadmin') {
      showToast('Solo técnicos y administradores pueden cambiar el estado', 'error');
      return;
    }
  } catch(e) {
    showToast('Error verificando permisos', 'error');
    return;
  }
  
  const client = window.supabaseClient;
  const { error } = await client
    .from('equipos')
    .update({ estado: nuevoEstado })
    .eq('id', maquinaId);
    
  if (error) {
    showToast('Error al cambiar estado: ' + error.message, 'error');
    return;
  }
  
  await cargarEstadoMaquina();
  showToast(`Estado cambiado a ${nuevoEstado}`, 'success');
}

// ── Seguimiento de Incidencias ────────────────────────────────────────────────
async function cargarSeguimientoIncidencia() {
  // Determinar rol del usuario actual
  const sessionStr = localStorage.getItem('sgi_user_session') || localStorage.getItem('sgi_admin_session');
  let rolActual = 'usuario';
  if (sessionStr) {
    try { const s = JSON.parse(sessionStr); rolActual = s.type || s.rol || 'usuario'; } catch(e) {}
  }
  const esTecnicoOAdmin = rolActual === 'tecnico' || rolActual === 'admin' || rolActual === 'superadmin';
  // Ocultar paneles de acción si el usuario no tiene permisos
  const mostrar = esTecnicoOAdmin ? '' : 'none';
  ['panelNuevaNota', 'panelEstadoMaquina', 'panelResolverIncidencia'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = mostrar;
  });

  console.log('🔄 Cargando seguimiento para incidencia:', incidenciaAbiertaId);
  
  if (!incidenciaAbiertaId) {
    console.error('❌ No hay ID de incidencia abierta');
    return;
  }
  
  const client = window.supabaseClient;
  
  // Cargar datos de la incidencia (con JOIN a perfiles para nombre del operario)
  const { data: incidencia, error: incError } = await client
    .from('registros')
    .select('*, perfiles(nombre)')
    .eq('id', incidenciaAbiertaId)
    .single();
    
  if (incError) {
    console.error('❌ Error cargando incidencia:', incError);
    document.getElementById('incDescTexto').textContent = 'Error al cargar datos de la incidencia';
    return;
  }
  
  console.log('✅ Incidencia cargada:', incidencia);
  
  // Cargar estado de la máquina
  await cargarEstadoMaquina();
  
  // Mostrar descripción de la incidencia
  document.getElementById('incDescTexto').textContent = incidencia.observaciones || 'Sin descripción';
  document.getElementById('incDescMeta').textContent = `Reportado por ${incidencia.perfiles?.nombre || 'Desconocido'} el ${new Date(incidencia.timestamp).toLocaleString('es-ES')}`;
  
  // Cargar seguimientos
  const timeline = document.getElementById('seguimientoTimeline');
  timeline.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5">Cargando seguimientos...</div>';
  
  const { data: seguimientos, error: segError } = await client
    .from('seguimientos')
    .select('*, perfiles(nombre)')
    .eq('incidencia_id', incidenciaAbiertaId)
    .order('timestamp', { ascending: true });
    
  if (segError) {
    timeline.innerHTML = '<div style="color:var(--danger);font-size:12px;text-align:center">Error al cargar seguimientos</div>';
    return;
  }
  
  if (!seguimientos || seguimientos.length === 0) {
    timeline.innerHTML = `<div style="text-align:center;padding:20px;opacity:0.5;font-size:13px">No hay notas de seguimiento aún.${esTecnicoOAdmin ? '<br>Escribe una nota abajo.' : ''}</div>`;
  } else {
    timeline.innerHTML = seguimientos.map(s => `
      <div style="margin-bottom:16px;padding:12px;background:rgba(79,142,247,0.05);border-radius:8px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">
          <strong>${s.perfiles?.nombre || 'Técnico'}</strong> · ${new Date(s.timestamp).toLocaleString('es-ES', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
        </div>
        <div style="font-size:14px;color:var(--text-primary)">${s.nota}</div>
      </div>
    `).join('');
  }
  
  // Scroll al final
  timeline.scrollTop = timeline.scrollHeight;
}

async function guardarNotaSeguimiento() {
  const input = document.getElementById('nuevaNotaSeguimiento');
  const nota = input.value.trim();
  
  if (!nota || !incidenciaAbiertaId) {
    alert('Escribe una nota primero');
    return;
  }
  
  // Obtener usuario actual
  let usuarioNombre = 'Técnico';
  let usuarioRol = 'usuario';
  let usuarioId = null;
  const sessionStr = localStorage.getItem('sgi_user_session') || localStorage.getItem('sgi_admin_session');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      usuarioNombre = session.nombre || session.username || 'Técnico';
      usuarioRol = session.type || session.rol || 'usuario';
      usuarioId = session.userId || null;
    } catch(e) {}
  }

  if (usuarioRol !== 'tecnico' && usuarioRol !== 'admin' && usuarioRol !== 'superadmin') {
    showToast('Solo técnicos y administradores pueden añadir notas de seguimiento', 'error');
    return;
  }
  
  const btn = document.getElementById('btnGuardarNota');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  
  const client = window.supabaseClient;
  
  // 1. Insertar la nota de seguimiento
  const { error } = await client
    .from('seguimientos')
    .insert({
      incidencia_id: incidenciaAbiertaId,
      nota: nota,
      usuario_id: usuarioId,
      timestamp: new Date().toISOString()
    });
    
  if (error) {
    alert('Error al guardar nota: ' + error.message);
    btn.disabled = false;
    btn.textContent = '➕ Añadir Nota';
    return;
  }
  
  // 2. Marcar la incidencia como "en seguimiento" (si existe el campo)
  try {
    await client
      .from('registros')
      .update({ en_seguimiento: true })
      .eq('id', incidenciaAbiertaId);
  } catch (e) {
    // Si el campo no existe, ignorar el error
    console.log('Campo en_seguimiento no existe o error al actualizar:', e);
  }
  
  input.value = '';
  await cargarSeguimientoIncidencia();
  btn.disabled = false;
  btn.textContent = '➕ Añadir Nota';
}

// ── Custom Confirm Modal ─────────────────────────────────────────────────────
function customConfirm(message, onConfirm, onCancel) {
  // Remover modal existente si hay
  const existing = document.getElementById('customConfirmModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'customConfirmModal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `;
  
  modal.innerHTML = `
    <div style="
      background: var(--card-bg, white);
      border-radius: 16px;
      padding: 24px 28px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    ">
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary, #1f2937);">
        ¿Marcar incidencia como resuelta?
      </div>
      <div style="font-size: 14px; color: var(--text-muted, #6b7280); margin-bottom: 24px; line-height: 1.5;">
        ${message}
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="confirmCancel" style="
          padding: 10px 20px;
          border-radius: 10px;
          border: 1.5px solid var(--border, #e5e7eb);
          background: transparent;
          color: var(--text-muted, #6b7280);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">Cancelar</button>
        <button id="confirmAccept" style="
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--success, #10b981);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        ">Marcar como resuelta</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      if (onCancel) onCancel();
    }
  });
  
  document.getElementById('confirmCancel').addEventListener('click', () => {
    modal.remove();
    if (onCancel) onCancel();
  });
  
  document.getElementById('confirmAccept').addEventListener('click', () => {
    modal.remove();
    if (onConfirm) onConfirm();
  });
}

async function resolverIncidencia() {
  // Verificar rol
  const sessionStr = localStorage.getItem('sgi_user_session') || localStorage.getItem('sgi_admin_session');
  let rolCheck = 'usuario';
  if (sessionStr) {
    try { const s = JSON.parse(sessionStr); rolCheck = s.type || s.rol || 'usuario'; } catch(e) {}
  }
  if (rolCheck !== 'tecnico' && rolCheck !== 'admin' && rolCheck !== 'superadmin') {
    showToast('Solo técnicos y administradores pueden resolver incidencias', 'error');
    return;
  }

  if (!incidenciaAbiertaId) {
    showToast('No hay ninguna incidencia activa', 'error');
    return;
  }

  const comentario = document.getElementById('notaResolucion').value.trim();
  
  if (!comentario) {
    showToast('Añade un comentario de resolución', 'error');
    return;
  }
  
  customConfirm(
    '¿Confirmas que quieres marcar esta incidencia como resuelta?',
    async () => {
      // Obtener usuario actual
      let usuarioNombre = 'Técnico';
      let usuarioId = null;
      const sessionStr = localStorage.getItem('sgi_user_session') || localStorage.getItem('sgi_admin_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          usuarioNombre = session.nombre || session.username || 'Técnico';
          usuarioId = session.userId || null;
        } catch(e) {}
      }
      
      const client = window.supabaseClient;
      
      // Añadir nota de resolución
      await client.from('seguimientos').insert({
        incidencia_id: incidenciaAbiertaId,
        nota: `✅ RESUELTO: ${comentario}`,
        usuario_id: usuarioId,
        timestamp: new Date().toISOString()
      });
      
      // Marcar incidencia como resuelta
      const { error } = await client
        .from('registros')
        .update({ 
          resuelta: true, 
          en_seguimiento: false
        })
        .eq('id', incidenciaAbiertaId);
        
      if (error) {
        showToast('Error al marcar como resuelta: ' + error.message, 'error');
        return;
      }

      // No cambiar el estado de la máquina al resolver la incidencia
      // El estado de la máquina debe gestionarse manualmente

      showToast('Incidencia marcada como resuelta', 'success');
      setTimeout(() => window.location.href = 'estado.html', 1500);
    }
  );
}
