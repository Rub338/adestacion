// ── Inicialización Principal ───────────────────────────────────────────────────
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

  detectarServidor();
  await cargarRolUsuario();

  // Si es usuario normal (no admin ni técnico), redirigir al portal
  if (rolActual === 'usuario') {
    window.location.href = 'estado.html';
    return;
  }

  // Prefer admin session; si no, permitir sesión de 'tecnico'
  let sgiSession = null;
  if (adminSessionStr) {
    sgiSession = JSON.parse(adminSessionStr || '{}');
  } else if (userSessionStr && (rolActual === 'tecnico' || rolActual === 'admin')) {
    try {
      sgiSession = JSON.parse(userSessionStr || '{}');
      sgiSession._isUserSession = true;
    } catch(e) { sgiSession = null; }
  } else {
    return;
  }
  window.sgiAdminSession = sgiSession;

  try {
    isCargando = true;
    console.log('Iniciando carga del dashboard...');

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

    // Ocultar controles sensibles para técnicos
    if (rolActual !== 'admin') {
      ['btnBorrarMaquinaModal','btnNuevaMaquina','btnToggleEditarMaquina','btnGuardarMaquina','btnGestionarSalas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }

    // Restaurar sección guardada al refrescar
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
