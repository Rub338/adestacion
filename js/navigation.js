// ── Navegación ───────────────────────────────────────────────────────────────
const sectionTitles = {
  dashboard: ['Resumen', 'Resumen del sistema'],
  maquinas: ['Máquinas y Salas', 'Gestión de máquinas y salas'],
  incidencias: ['Incidencias', 'Gestión de fallos técnicos y reparaciones'],
  qrcodes: ['Códigos QR', 'QR individuales para el usuario móvil'],
  usuarios: ['Usuarios del Sistema', 'Gestión de accesos y privilegios de usuario']
};

async function navigateTo(section, machineId = null, incFilter = null) {
  const rutasRestringidasParaTecnico = ['usuarios'];
  let idToShow = section;

  if (rolActual === 'tecnico' && rutasRestringidasParaTecnico.includes(section)) {
    idToShow = 'restringido';
  } else if (rolActual !== 'admin' && rolActual !== 'tecnico' && (section === 'usuarios' || section === 'qrcodes')) {
    idToShow = 'restringido';
  }

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
    localStorage.removeItem('sgi_admin_section');
    return;
  }

  const [title, sub] = sectionTitles[section] || [section, ''];
  document.getElementById('topbarTitle').textContent = title;
  document.getElementById('topbarSubtitle').textContent = sub;

  localStorage.setItem('sgi_admin_section', section);

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

(function initSidebar() {
  const isCollapsed = localStorage.getItem('sgi_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.body.classList.add('sidebar-collapsed');
  }
})();
