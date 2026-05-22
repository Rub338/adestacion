/**
 * Sistema de Gestión — Componentes de la Interfaz
 * Este archivo contiene la estructura del Dashboard para inyección dinámica,
 * asegurando que el código no sea visible en el DOM inicial por seguridad.
 */

const DASHBOARD_HTML = `
  <div class="layout">
    <!-- ── Sidebar ── -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="logo">
          <div class="logo-icon">
            <img src="images/logo-brain.png" alt="Logo" style="width: 32px; height: 32px;">
          </div>
          <div>
            <h1>Gestor de máquinas</h1>
            <p>Panel de Administración</p>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-item active" id="nav-dashboard" onclick="navigateTo('dashboard')" title="Resumen">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Resumen</span>
          </div>
          <div class="nav-item" id="nav-incidencias" onclick="navigateTo('incidencias')" title="Incidencias">
            <span class="nav-icon">🎫</span>
            <span class="nav-text">Incidencias</span>
            <span class="nav-badge" id="badge-incidencias" style="display:none">0</span>
          </div>
          <div class="nav-item" id="nav-maquinas" onclick="navigateTo('maquinas')" title="Máquinas y Salas">
            <span class="nav-icon">🏭</span>
            <span class="nav-text">Máquinas y Salas</span>
          </div>
          <div class="nav-item" id="nav-qrcodes" onclick="navigateTo('qrcodes')" title="Códigos QR">
            <span class="nav-icon">🔲</span>
            <span class="nav-text">Códigos QR</span>
          </div>
          <div class="nav-item" id="nav-usuarios" onclick="navigateTo('usuarios')" title="Usuarios">
            <span class="nav-icon">👥</span>
            <span class="nav-text">Usuarios</span>
            <span class="nav-badge" id="badge-usuarios" style="display:none;background:#f59e0b;color:#fff">0</span>
          </div>
        </div>
      </nav>

      <div class="sidebar-legend" style="padding:12px 14px;border-top:1px solid var(--border);margin-bottom:4px">
        <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">Leyenda</div>
        <div style="display:flex;flex-direction:column;gap:5px">
          <div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-secondary)">
            <span style="width:9px;height:9px;border-radius:50%;background:#10b981;flex-shrink:0"></span>Máquina activa
          </div>
          <div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-secondary)">
            <span style="width:9px;height:9px;border-radius:50%;background:#6b7280;flex-shrink:0"></span>Máquina inactiva
          </div>
          <div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-secondary)">
            <span style="width:9px;height:9px;border-radius:50%;background:var(--danger);flex-shrink:0"></span>Incidencia sin resolver
          </div>
          <div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-secondary)">
            <span style="width:9px;height:9px;border-radius:50%;background:var(--warning);flex-shrink:0"></span>En seguimiento
          </div>
        </div>
      </div>


    </aside>
    <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="toggleSidebar()"></div>

    <!-- ── Main ── -->
    <main class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-icon btn-outline" id="btnMenuMobile" onclick="toggleSidebar()"
            style="display:none">☰</button>
          <button class="btn btn-icon btn-text" id="btnMenuDesktop" onclick="toggleSidebarDesktop()"
            style="font-size:18px; padding:4px;" title="Colapsar menú">☰</button>
          <div>
            <div class="topbar-title" id="topbarTitle">Resumen</div>
            <div style="font-size:12px;color:var(--text-muted)" id="topbarSubtitle">Resumen del sistema</div>
          </div>
        </div>
        <div class="topbar-actions">
           <button class="btn btn-outline btn-sm" id="btnThemeToggle" onclick="toggleTheme()" style="border-radius:20px; padding: 6px 16px;">
             Tema oscuro
           </button>
           <button class="btn btn-outline btn-sm" onclick="iniciarTour()" style="border-radius:20px; padding: 6px 16px;">
             Guía Rápida
           </button>
           <div class="account-btn" id="accountBtn" style="display:none">
             <button class="account-btn-trigger" onclick="toggleAccountMenu()">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
               Cuenta
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
             </button>
             <div class="account-dropdown" id="accountDropdown">
               <div class="account-dropdown-info">
                 <div class="account-dropdown-name" id="dropdownUserName">Usuario</div>
                 <div class="account-dropdown-role" id="dropdownUserRole">Rol</div>
                 <div class="account-dropdown-email" id="dropdownUserEmail">correo@ejemplo.com</div>
               </div>
               <button class="account-dropdown-item" onclick="window.location.href='index.html'">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                 Volver al Inicio
               </button>
               <button class="account-dropdown-item" onclick="window.location.href='estado.html'">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                 Estado de Equipos
               </button>
               <button class="account-dropdown-item danger" style="border-top: 1px solid var(--border);" onclick="cerrarSesionAdmin()">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                 Cerrar sesión
               </button>
             </div>
           </div>
        </div>
      </header>

      <div class="page-content">

        <!-- ══════════ ACCESO RESTRINGIDO ══════════ -->
        <div class="section fade-in" id="section-restringido">
          <div class="restricted-screen">
            <div class="icon"></div>
            <h2>Acceso Restringido</h2>
            <p>No tienes los permisos suficientes para ver esta sección. Esta función está limitada a Administradores.</p>
            <button class="btn btn-primary" onclick="navigateTo('dashboard')">Volver al Panel</button>
          </div>
        </div>

        <!-- ══════════ DASHBOARD ══════════ -->
        <div class="section active fade-in" id="section-dashboard">
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;font-size:12px;color:var(--text-secondary)">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:12px;height:12px;border-radius:50%;background:var(--success);box-shadow:0 0 0 2px rgba(22,163,74,0.2);display:inline-block"></span>
              <span><strong>Verde:</strong> Máquina activa</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:12px;height:12px;border-radius:50%;background:var(--text-muted);box-shadow:0 0 0 2px rgba(107,114,128,0.2);display:inline-block"></span>
              <span><strong>Gris:</strong> Máquina inactiva</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:12px;height:12px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 2px rgba(220,38,38,0.2);display:inline-block"></span>
              <span><strong>Rojo:</strong> Incidencia sin resolver</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:12px;height:12px;border-radius:50%;background:var(--warning);box-shadow:0 0 0 2px rgba(245,158,11,0.2);display:inline-block"></span>
              <span><strong>Amarillo:</strong> En seguimiento</span>
            </div>
          </div>
          <!-- KPI Cards en fila horizontal -->
          <div class="kpi-grid" id="kpiGrid" style="margin-bottom:16px;grid-template-columns:1fr 1fr">
            <!-- Tarjeta unificada de Incidencias -->
            <div class="kpi-card rojo" style="border:2px solid var(--danger);animation:pulse-red 2s infinite;display:flex;flex-direction:column">
              <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px">Incidencias</div>
              <div style="display:flex;gap:24px;align-items:center;flex:1">
                <div style="text-align:center;flex:1">
                  <div class="kpi-value" id="kpi-sin-resolver" style="color:var(--danger);font-size:28px">–</div>
                  <div style="font-size:11px;color:var(--text-secondary)">Sin resolver</div>
                </div>
                <div style="width:1px;height:40px;background:var(--border)"></div>
                <div style="text-align:center;flex:1">
                  <div class="kpi-value" id="kpi-en-seguimiento-dash" style="color:var(--warning);font-size:28px">–</div>
                  <div style="font-size:11px;color:var(--text-secondary)">En seguimiento</div>
                </div>
              </div>
              <button onclick="navigateTo('incidencias')" style="margin-top:10px;width:100%;padding:6px 0;background:var(--danger);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Ir al panel →</button>
            </div>
            <!-- Tarjeta de Máquinas -->
            <div class="kpi-card" style="border:2px solid var(--border);display:flex;flex-direction:column">
              <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px">Máquinas</div>
              <div style="display:flex;gap:12px;align-items:center;flex:1">
                <div style="text-align:center;flex:1">
                  <div class="kpi-value" id="kpi-maq-activas" style="color:var(--success);font-size:28px">–</div>
                  <div style="font-size:11px;color:var(--text-secondary)">Activas</div>
                </div>
                <div style="width:1px;height:40px;background:var(--border)"></div>
                <div style="text-align:center;flex:1">
                  <div class="kpi-value" id="kpi-maq-inactivas" style="color:var(--text-muted);font-size:28px">–</div>
                  <div style="font-size:11px;color:var(--text-secondary)">Inactivas</div>
                </div>
              </div>
              <button onclick="navigateTo('maquinas')" style="margin-top:10px;width:100%;padding:6px 0;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Ver máquinas →</button>
            </div>
          </div>

          <!-- Alerta usuarios pendientes de alta (visible solo cuando hay usuarios esperando) -->
          <div id="kpi-usuarios-pendientes-card" style="display:none;margin-bottom:16px;padding:14px 18px;background:rgba(245,158,11,0.08);border:2px solid #f59e0b;border-radius:12px;align-items:center;gap:16px;cursor:pointer" onclick="navigateTo('usuarios'); setTimeout(()=>filtrarUsuarios('pendientes'),200)">
            <span style="font-size:32px;flex-shrink:0">⏳</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:2px">Usuarios pendientes de activación</div>
              <div style="font-size:13px;color:var(--text-muted)"><span id="kpi-usuarios-pendientes-count">0</span> usuario(s) esperan ser dados de alta por un administrador.</div>
            </div>
            <button style="padding:6px 14px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">Gestionar →</button>
          </div>

          <!-- Layout dividido: usa el mismo grid de 3 columnas para alineación perfecta -->
          <div class="kpi-grid" style="margin-bottom:16px;grid-template-columns:1fr 1fr 1fr">
            <!-- Izquierda: tabla incidencias ocupa 2 columnas -->
            <div class="table-wrap" style="min-height:320px;display:flex;flex-direction:column;grid-column:span 2">
              <div class="table-header">
                <div class="table-title">Incidencias sin resolver</div>
                <button class="btn btn-outline btn-sm" onclick="navigateTo('incidencias')">Ver todas →</button>
              </div>
              <div style="overflow-x:auto;flex:1">
                <table>
                  <thead>
                    <tr>
                      <th>Máquina</th>
                      <th>Sala</th>
                      <th>Por</th>
                      <th>Reportado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="dashboardIncPendientes"></tbody>
                </table>
              </div>
              <div id="dashboardIncEmpty" style="display:none;padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No hay incidencias sin resolver</div>
            </div>

            <!-- Derecha: info máquinas ocupa 1 columna -->
            <div class="table-wrap" style="min-height:320px;display:flex;flex-direction:column">
              <div class="table-header">
                <div class="table-title">Máquinas inactivas</div>
              </div>
              <div id="dashboardMaqInactivas" style="display:flex;flex-direction:column;gap:4px;padding:12px;flex:1"></div>
            </div>
          </div>

        </div>

        <!-- ══════════ MÁQUINAS ══════════ -->
        <div class="section fade-in" id="section-maquinas">
          <div class="section-header">
            <div>
              <div class="section-title" style="display:flex;align-items:center;gap:8px">
                Máquinas y Salas
                <button class="btn btn-text btn-sm" onclick="toggleGuia('help-maquinas')" style="padding:2px" title="Mostrar guía">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </button>
              </div>
              <div class="section-subtitle" id="subtitle-maquinas">Cargando...</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <div style="position:relative;display:flex;align-items:center">
                <svg style="position:absolute;left:10px;width:15px;height:15px;color:var(--text-muted);pointer-events:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="searchMaquinas" oninput="filtrarMaquinas()"
                  style="padding:8px 12px 8px 32px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary);color:var(--text-primary);font-family:inherit;width:180px;outline:none"
                  onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
              </div>
              <select class="form-control" id="filtroSalaMaquinas" onchange="filtrarMaquinas()"
                style="width:160px;padding:8px 12px;font-size:13px">
                <option value="">Todas las salas</option>
              </select>
              <div style="display:flex;gap:4px">
                <button class="btn btn-outline btn-sm active" id="btn-maq-todas" onclick="filtrarEstadoMaquinas('todas')" style="border-radius:20px;padding:6px 12px">Todas</button>
                <button class="btn btn-outline btn-sm" id="btn-maq-activas" onclick="filtrarEstadoMaquinas('activas')" style="border-radius:20px;padding:6px 12px;border-color:#10b981;color:#10b981">Activas</button>
                <button class="btn btn-outline btn-sm" id="btn-maq-inactivas" onclick="filtrarEstadoMaquinas('inactivas')" style="border-radius:20px;padding:6px 12px;border-color:#6b7280;color:#6b7280">Inactivas</button>
              </div>
              <button class="btn btn-outline" onclick="abrirModalGestionSalas()" id="btnGestionarSalas">Salas</button>
              <button class="btn btn-primary" onclick="abrirModalNuevaMaquina()" id="btnNuevaMaquina">+ Nueva máquina</button>
            </div>
          </div>
          <div id="help-maquinas" class="table-wrap" style="display:none;margin-bottom:20px;background:rgba(79,142,247,0.05);border:1px solid rgba(79,142,247,0.2);border-radius:16px;padding:20px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <span style="font-size:24px"></span>
              <div style="flex:1">
                <div style="font-weight:700;margin-bottom:4px">¿Cómo gestionar máquinas y salas?</div>
                <div style="font-size:13px;color:var(--text-muted);line-height:1.7">
                  Empieza creando las <strong>salas</strong> del centro. Después, asigna cada máquina a su sala. Desde aquí puedes editar, eliminar o cambiar el estado operativo de cualquier equipo.<br><br>
                  En cada tarjeta verás las incidencias abiertas de esa máquina en tiempo real.
                </div>
              </div>
              <button class="btn btn-text btn-sm" onclick="toggleGuia('help-maquinas')" style="color:var(--text-muted);padding:2px 6px">✕</button>
            </div>
          </div>

          <div class="grid-maquinas" id="gridMaquinas"></div>
        </div>

        <!-- ══════════ INCIDENCIAS ══════════ -->
        <div class="section fade-in" id="section-incidencias">
          <div class="section-header">
            <div>
              <div class="section-title" style="display:flex;align-items:center;gap:8px">
                Incidencias
                <button class="btn btn-text btn-sm" onclick="toggleGuia('help-incidencias')" style="padding:2px" title="Mostrar guía">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </button>
              </div>
              <div class="section-subtitle" id="subtitle-incidencias">Cargando...</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <div id="filtro-incidencias-label" style="font-size:12px;color:var(--text-muted);font-weight:500;white-space:nowrap"></div>
              <button class="btn btn-outline btn-sm active" id="btn-inc-todas" onclick="renderIncidencias('todas')">Abiertas</button>
              <button class="btn btn-outline btn-sm" id="btn-inc-pendientes" onclick="renderIncidencias('pendientes')" style="border-color:var(--danger);color:var(--danger)">Sin resolver</button>
              <button class="btn btn-outline btn-sm" id="btn-inc-seguimiento" onclick="toggleSeguimiento()" style="border-color:var(--warning);color:var(--warning)">En seguimiento</button>
              <button class="btn btn-outline btn-sm" id="btn-inc-resueltas" onclick="renderIncidencias('resueltas')" style="border-color:var(--success);color:var(--success)" title="Ver incidencias resueltas">Resueltas</button>
              <div style="width:1px;height:24px;background:var(--border);margin:0 2px"></div>
              <select id="select-inc-orden" onchange="cambiarOrdenInc(this.value)" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-primary);cursor:pointer">
                <option value="fecha-desc">Fecha (reciente)</option>
                <option value="fecha-asc">Fecha (antigua)</option>
                <option value="maquina">Por máquina</option>
              </select>
              <div style="width:1px;height:24px;background:var(--border);margin:0 2px"></div>
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">Inicio:</span>
                <input type="date" id="filtroIncDesde" onchange="renderIncidencias(filtroIncActual || 'todas')" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-primary)">
              </div>
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">Fin:</span>
                <input type="date" id="filtroIncHasta" onchange="renderIncidencias(filtroIncActual || 'todas')" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-primary)">
              </div>
              <button class="btn btn-outline btn-sm" onclick="exportarCSV()" title="Exporta solo las incidencias actualmente filtradas">Exportar CSV (filtrado)</button>
            </div>
          </div>

          <div id="help-incidencias" class="table-wrap" style="display:none;margin-bottom:20px;background:rgba(79,142,247,0.05);border:1px solid rgba(79,142,247,0.2);border-radius:16px;padding:20px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <span style="font-size:24px"></span>
              <div style="flex:1">
                <div style="font-weight:700;margin-bottom:4px">¿Cómo funcionan las incidencias?</div>
                <div style="font-size:13px;color:var(--text-muted);line-height:1.7">
                  Un usuario reporta un problema escaneando el QR de una máquina. La incidencia aparece aquí como <strong style="color:var(--danger)">Sin resolver</strong>.<br><br>
                  Cuando un técnico empieza a trabajar en ella, puede añadir notas de seguimiento y la incidencia pasa a <strong style="color:var(--warning)">En seguimiento</strong>. Una vez solucionada, se marca como <strong style="color:var(--success)">Resuelta</strong>.<br><br>
                  Puedes filtrar por estado, por rango de fechas, ordenar como prefieras y exportar el resultado a CSV.
                </div>
              </div>
              <button class="btn btn-text btn-sm" onclick="toggleGuia('help-incidencias')" style="color:var(--text-muted);padding:2px 6px">✕</button>
            </div>
          </div>

          <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
            <div class="kpi-card rojo" id="kpi-inc-pendientes-card">
              <div class="kpi-icon"></div>
              <div class="kpi-value" id="kpi-inc-pendientes">0</div>
              <div class="kpi-label">Sin resolver</div>
            </div>
            <div class="kpi-card amarillo" id="kpi-inc-seguimiento-card">
              <div class="kpi-icon"></div>
              <div class="kpi-value" id="kpi-inc-seguimiento">0</div>
              <div class="kpi-label">En Seguimiento</div>
            </div>
            <div class="kpi-card verde" id="kpi-inc-resueltas-card">
              <div class="kpi-icon"></div>
              <div class="kpi-value" id="kpi-inc-resueltas">0</div>
              <div class="kpi-label">Resueltas</div>
            </div>
          </div>

          <div class="incidencias-container">
            <div id="gridTicketsIncidencias" class="tickets-grid">
              <!-- Los tickets de incidencia se inyectarán aquí -->
            </div>
            
            <div id="incidenciasEmpty" class="empty-state" style="display:none">
              <div class="icon"></div>
              <p>No hay incidencias activas en este momento</p>
            </div>
          </div>
        </div>

        <!-- ══════════ USUARIOS / ADMINISTRADORES ══════════ -->
        <div class="section fade-in" id="section-usuarios">
          <div class="section-header">
            <div>
              <div class="section-title" style="display:flex;align-items:center;gap:8px">
                Usuarios del Sistema
                <button class="btn btn-text btn-sm" onclick="toggleGuia('help-usuarios')" style="padding:2px" title="Mostrar guía">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </button>
              </div>
              <div class="section-subtitle" id="subtitle-usuarios">Cargando...</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <div style="position:relative;display:inline-block">
                <button class="btn btn-outline btn-sm" id="btnRolesHelp" onclick="toggleRolesHelp()" style="font-weight:700;padding:6px 12px">Guía de roles</button>
                <div id="rolesHelpPopover" style="display:none;position:absolute;right:0;top:calc(100% + 8px);z-index:200;width:300px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.15);padding:18px 20px;font-size:13px;line-height:1.6">
                  <div style="font-weight:700;margin-bottom:12px;font-size:14px">Roles del sistema</div>
                  <div style="margin-bottom:10px"><span style="background:rgba(239,68,68,0.1);color:#dc2626;border-radius:6px;padding:2px 8px;font-weight:600;font-size:12px">Usuario</span><br><span style="color:var(--text-secondary)">Solo puede registrar reportes desde el portal de reportes. Sin acceso al panel.</span></div>
                  <div style="margin-bottom:10px"><span style="background:rgba(16,163,74,0.1);color:#16a34a;border-radius:6px;padding:2px 8px;font-weight:600;font-size:12px">Técnico</span><br><span style="color:var(--text-secondary)">Accede al panel para ver máquinas e incidencias. No puede editar máquinas ni gestionar usuarios.</span></div>
                  <div><span style="background:rgba(79,142,247,0.1);color:#3b82f6;border-radius:6px;padding:2px 8px;font-weight:600;font-size:12px">Administrador</span><br><span style="color:var(--text-secondary)">Acceso completo: crear/editar máquinas, gestionar usuarios y todas las secciones.</span></div>
                </div>
              </div>
            </div>
          </div>

          <div id="help-usuarios" class="table-wrap" style="margin-bottom:20px;background:rgba(79,142,247,0.05);border:1px solid rgba(79,142,247,0.2);border-radius:16px;padding:20px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <span style="font-size:24px"></span>
              <div style="flex:1">
                <div style="font-weight:700;margin-bottom:4px">¿Cómo se gestiona el acceso?</div>
                <div style="font-size:13px;color:var(--text-muted);line-height:1.7">
                  Los usuarios se registran con su email y contraseña. Hasta que un administrador los apruebe, aparecen aquí como <strong>Pendientes de alta</strong>.<br><br>
                  Una vez aprobados, puedes asignarles un rol: <strong>Técnico</strong> para acceso al panel sin permisos de gestión, o <strong>Admin</strong> para acceso completo. Los usuarios sin rol especial solo pueden reportar incidencias desde el portal y consultar el estado de equipos.
                </div>
              </div>
              <button class="btn btn-text btn-sm" onclick="toggleGuia('help-usuarios')" style="color:var(--text-muted);padding:2px 6px">✕</button>
            </div>
          </div>

          <!-- Filtros por Rol -->
          <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:13px;color:var(--text-muted);font-weight:600;">Filtrar:</span>
            <button id="btnFiltroTodos" class="btn btn-sm" onclick="filtrarUsuarios('todos')" style="background:var(--accent);color:white;padding:8px 16px;border-radius:20px;border:none;cursor:pointer;font-weight:600;font-size:13px;">Todos</button>
            <button id="btnFiltroAdmin" class="btn btn-outline btn-sm" onclick="filtrarUsuarios('admin')" style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer;font-weight:600;font-size:13px;">Administradores</button>
            <button id="btnFiltroTecnico" class="btn btn-outline btn-sm" onclick="filtrarUsuarios('tecnico')" style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer;font-weight:600;font-size:13px;">Técnicos</button>
            <button id="btnFiltroUsuario" class="btn btn-outline btn-sm" onclick="filtrarUsuarios('usuario')" style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer;font-weight:600;font-size:13px;">Usuarios</button>
            <button id="btnFiltroPendientes" class="btn btn-outline btn-sm" onclick="filtrarUsuarios('pendientes')" style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer;font-weight:600;font-size:13px;">Pendientes de alta</button>
          </div>

          <div class="table-wrap">
            <div style="overflow-x:auto">
              <table>
                <thead>
                  <tr>
                    <th>Nombre / Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="tablaUsuarios"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ══════════ QR CODES ══════════ -->
        <div class="section fade-in" id="section-qrcodes">
          <div class="section-header">
            <div>
              <div class="section-title" style="display:flex;align-items:center;gap:8px">
                Códigos QR
                <button class="btn btn-text btn-sm" onclick="toggleGuia('help-qrcodes')" style="padding:2px" title="Mostrar guía">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </button>
              </div>
              <div class="section-subtitle" id="subtitle-qrcodes">QR individuales para cada máquina</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
              <div style="position:relative;display:flex;align-items:center">
                <svg style="position:absolute;left:10px;width:15px;height:15px;color:var(--text-muted);pointer-events:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="buscarQR" class="form-control" placeholder="Buscar máquina..."
                  oninput="filtrarQRs()" style="width:220px;padding:8px 12px 8px 32px;font-size:13px">
              </div>
              <select class="form-control" id="filtroSalaQR" onchange="filtrarQRs()"
                style="width:160px;padding:8px 12px;font-size:13px">
                <option value="">Todas las salas</option>
              </select>
              <button class="btn btn-outline" onclick="imprimirTodosLosQRs()" style="display:flex;align-items:center;gap:6px;white-space:nowrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir todos
              </button>
            </div>
          </div>

          <div id="help-qrcodes" class="table-wrap" style="margin-bottom:20px;background:rgba(79,142,247,0.05);border:1px solid rgba(79,142,247,0.2);border-radius:16px;padding:20px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <span style="font-size:24px"></span>
              <div style="flex:1">
                <div style="font-weight:700;margin-bottom:4px">¿Cómo funciona?</div>
                <div style="font-size:13px;color:var(--text-muted);line-height:1.7">
                  Cada máquina tiene su propio código QR. Pégalo cerca de la máquina o tenlo a mano en pantalla.<br>
                  Cuando alguien tenga un problema, solo tiene que escanearlo con el móvil y la máquina quedará seleccionada automáticamente para la creación de una incidencia.
                </div>
              </div>
              <button class="btn btn-text btn-sm" onclick="toggleGuia('help-qrcodes')" style="color:var(--text-muted);padding:2px 6px">✕</button>
            </div>
          </div>

          <div class="grid-maquinas" id="gridQRs"></div>
        </div>

      </div><!-- /page-content -->
    </main>
  </div><!-- /layout -->

  <!-- ── Modal: Ver QR ── -->
  <div class="overlay" id="modalQR">
    <div class="modal card" style="max-width:400px; text-align:center">
      <div class="modal-header">
        <div class="modal-title" id="qrNombre">Máquina</div>
        <button class="modal-close" onclick="cerrarModal('modalQR')">✕</button>
      </div>
      <div style="margin-bottom:8px; color:var(--text-muted); font-size:14px" id="qrSala">Sala</div>
      <div id="qrImgContainer" style="display:flex; justify-content:center; margin:20px 0; min-height:320px"></div>
      <a id="qrUrl" class="text-accent" style="word-break:break-all; font-size:11px; margin-bottom:20px; display:block" target="_blank">URL</a>
      <button class="btn btn-primary btn-full" onclick="imprimirQR()">Imprimir Etiqueta</button>
      <button class="btn btn-outline" onclick="cerrarModal('modalQR')">Cerrar</button>
    </div>
  </div>

  <!-- ── Modal: Editar Máquina ── -->
  <div class="overlay" id="modalMaquina">
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-primary btn-sm" id="btnToggleEditarMaquina" onclick="toggleModoEdicionMaquina()" style="padding: 8px 16px; font-size:13px; font-weight:600; min-width:80px; border-radius:8px; box-shadow:0 2px 8px rgba(59,130,246,0.3); transition:all 0.2s ease;">Editar</button>
          <div class="modal-title">Detalles de Máquina</div>
        </div>
        <button class="modal-close" onclick="cerrarModal('modalMaquina')">✕</button>
      </div>
      <div class="modal-body">
        <div id="msgTecnico" style="display:none;background:rgba(59,130,246,0.1);border:1px solid var(--accent);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--accent)">
          Como técnico, solo puedes modificar el <strong>Estado operativo</strong> de la máquina (Activa/Inactiva).
        </div>
        <input type="hidden" id="editMaquinaId">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input class="form-control" id="editNombre" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" id="editTipo"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Modelo</label>
            <input class="form-control" id="editModelo" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">Estado operativo</label>
            <select class="form-control" id="editEstado">
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descripcion / Especificaciones adicionales</label>
          <textarea class="form-control" id="editNotas" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-text btn-sm" id="btnBorrarMaquinaModal" onclick="eliminarMaquina(document.getElementById('editMaquinaId').value)">Borrar</button>
        <div style="flex:1"></div>
        <button class="btn btn-outline" onclick="cerrarModal('modalMaquina')">Cancelar</button>
        <button class="btn btn-primary" id="btnGuardarMaquina" onclick="guardarMaquina()">Guardar cambios</button>
      </div>
    </div>
  </div>

  <!-- ── Modal: Crear Máquina ── -->
  <div class="overlay" id="modalNuevaMaquina">
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-title">Nueva Máquina</div>
        <button class="modal-close" onclick="cerrarModal('modalNuevaMaquina')">✕</button>
      </div>
      <div class="modal-body">
        <div id="msgNuevaMaquina"></div>
        <div class="form-group">
          <label class="form-label">Nombre <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="nuevoMaquinaNombre" type="text">
        </div>
        <div class="form-group">
          <label class="form-label">Sala <span style="color:var(--danger)">*</span></label>
          <select class="form-control" id="nuevoMaquinaSala"></select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" id="nuevoMaquinaTipo"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Modelo</label>
            <input class="form-control" id="nuevoMaquinaModelo" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">Estado operativo</label>
            <select class="form-control" id="nuevoMaquinaEstado">
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descripcion / Especificaciones adicionales</label>
          <textarea class="form-control" id="nuevoMaquinaNotas" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="cerrarModal('modalNuevaMaquina')">Cancelar</button>
        <button class="btn btn-primary" onclick="crearMaquina()">Crear máquina</button>
      </div>
    </div>
  </div>

  <!-- ── Modal: Detalle sesión ── -->
  <div class="overlay" id="modalDetalle">
    <div class="modal" style="max-width:650px; width:90%">
      <div class="modal-header">
        <div class="modal-title" id="modalDetalleTitulo">Detalles de la Incidencia</div>
        <button class="modal-close" onclick="cerrarModal('modalDetalle')">✕</button>
      </div>
      
      <div>
      <div id="detalleContenido" style="margin-bottom:24px"></div>

      <!-- Sección de Seguimiento (Solo para Incidencias) -->
      <div id="seccionSeguimiento" style="display:none; border-top:1px solid var(--border); padding-top:20px">
        <h3 style="font-size:16px; margin-bottom:16px; display:flex; align-items:center; gap:8px">
          Hilo de Seguimiento Técnico
        </h3>
        
        <div id="seguimientoTimeline" class="timeline-container" style="margin-bottom:20px; padding-right:10px">
          <!-- Las notas se inyectarán aquí -->
        </div>

        <div class="add-note-box" style="background:var(--bg-card); padding:15px; border-radius:12px; border:1px solid var(--accent)">
          <label class="form-label" style="font-size:12px">Añadir nueva nota de progreso:</label>
          <textarea id="nuevaNotaSeguimiento" class="form-control" rows="2" style="margin-bottom:10px; font-size:13px"></textarea>
          <div style="display:flex; justify-content:flex-end">
            <button class="btn btn-primary btn-sm" id="btnGuardarNota" onclick="guardarNuevaNota()">
              <span>Añadir Nota</span>
            </button>
          </div>
        </div>
      </div>

      </div>

      <div class="modal-footer" style="margin-top:20px">
        <button class="btn btn-outline" onclick="cerrarModal('modalDetalle')">Cerrar</button>
        <button class="btn btn-primary btn-sm" id="btnFinalizarIncidencia" style="display:none" onclick="finalizarIncidenciaDesdeModal()">Marcar como resuelta</button>
      </div>
    </div>
  </div>

  <!-- ── Modal: Historial Máquina ── -->
  <div class="overlay" id="modalHistorialMaquina">
    <div class="modal" style="max-width:800px; width: 95%">
      <div class="modal-header">
        <div>
          <div class="modal-title" id="historialMaquinaTitulo">Historial de Máquina</div>
          <div style="font-size:12px;color:var(--text-muted)" id="historialMaquinaSub">Cargando...</div>
        </div>
        <button class="modal-close" onclick="cerrarModal('modalHistorialMaquina')">✕</button>
      </div>
      <div class="table-wrap" style="max-height:60vh; overflow-y:auto">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Por</th>
              <th>Tipo</th>
              <th>Nota</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tablaHistorialMaquina"></tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="cerrarModal('modalHistorialMaquina')">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- ── Modal: Gestión Salas ── -->
  <div class="overlay" id="modalGestionSalas">
    <div class="modal" style="max-width:500px; width: 90%">
      <div class="modal-header">
        <div>
          <div class="modal-title">Gestionar Salas</div>
          <div style="font-size:12px;color:var(--text-muted)">Crea o elimina salas de trabajo</div>
        </div>
        <button class="modal-close" onclick="cerrarModal('modalGestionSalas')">✕</button>
      </div>
      
      <div class="form-group" style="background:var(--bg-secondary); padding:16px; border-radius:12px; margin-bottom:20px">
        <label class="form-label">Nombre de la nueva sala</label>
        <div style="display:flex; gap:8px">
          <input type="text" id="nuevaSalaNombre" class="form-control">
          <button class="btn btn-primary" onclick="crearSala()">+ Añadir</button>
        </div>
      </div>

      <div class="table-wrap" style="max-height:300px; overflow-y:auto; background:var(--bg-secondary);">
        <table style="width:100%">
          <thead>
            <tr>
              <th style="padding:10px">Nombre</th>
              <th style="padding:10px; text-align:right">Acción</th>
            </tr>
          </thead>
          <tbody id="listaSalasGestion"></tbody>
        </table>
      </div>

      <div class="modal-footer" style="margin-top:20px">
        <button class="btn btn-outline" onclick="cerrarModal('modalGestionSalas')">Cerrar</button>
      </div>
    </div>
  </div>


  <!-- ── Modal: Prompt Personalizado ── -->
  <div class="overlay" id="modalPrompt">
    <div class="modal" style="max-width:450px">
      <div class="modal-header">
        <div class="modal-title" id="promptTitle">Título</div>
        <button class="modal-close" onclick="cerrarModal('modalPrompt')">✕</button>
      </div>
      <div class="form-group" style="overflow:visible !important">
        <label class="form-label" id="promptLabel">Instrucciones</label>
        <input id="promptInput" class="form-control" type="text" style="padding:12px 14px;font-size:15px">
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window.promptReject?.()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.promptResolve?.()">Aceptar</button>
      </div>
    </div>
  </div>

  <!-- ── Modal: Feedback / Alerta ── -->
  <div class="overlay" id="modalFeedback">
    <div class="modal" style="max-width:350px; text-align:center; padding: 32px 24px">
      <div>
        <div style="font-size:52px; margin-bottom:16px" id="feedbackIcon"></div>
        <div class="modal-title" id="feedbackTitle" style="margin-bottom:12px; font-size:20px">Título</div>
        <p id="feedbackMsg" style="color:var(--text-muted); font-size:14px; margin-bottom:28px; line-height:1.5">Mensaje</p>
      </div>
      <div class="modal-footer" style="justify-content:center; margin-top:0">
        <button class="btn btn-primary btn-full" onclick="cerrarModal('modalFeedback')">Continuar</button>
      </div>
    </div>
  </div>

  <!-- ── Modal: Confirmación ── -->
  <div class="overlay" id="modalConfirm">
    <div class="modal" style="max-width:400px; text-align:center; padding: 36px 28px">
      <div>
        <div style="font-size:52px; margin-bottom:16px; line-height:1" id="confirmIcon"></div>
        <div class="modal-title" id="confirmTitle" style="margin-bottom:10px; font-size:18px">¿Estás seguro?</div>
        <p id="confirmMsg" style="color:var(--text-muted); font-size:14px; margin-bottom:28px; line-height:1.6">Esta acción no se puede deshacer.</p>
      </div>
      <div class="modal-footer" style="margin-top:0">
        <button class="btn btn-outline btn-full" onclick="window.confirmReject?.()">Cancelar</button>
        <button class="btn btn-danger btn-full" id="confirmAcceptBtn" onclick="window.confirmResolve?.()">Confirmar</button>
      </div>
    </div>
  </div>

  </div>
`;
