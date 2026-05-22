// ── Usuarios / Administradores ───────────────────────────────────────────────
let filtroRolUsuarios = 'todos';

function filtrarUsuarios(rol) {
  filtroRolUsuarios = rol;
  
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
        btn.style.cssText = 'background:var(--accent);color:white;padding:8px 16px;border-radius:20px;border:none;cursor:pointer;font-weight:600;font-size:13px;';
      } else {
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

    const ordenRoles = { 'admin': 0, 'tecnico': 1, 'usuario': 2 };
    perfiles.sort((a, b) => {
      const ordenA = ordenRoles[a.rol] ?? 3;
      const ordenB = ordenRoles[b.rol] ?? 3;
      return ordenA - ordenB;
    });

    let perfilesFiltrados = perfiles;
    if (filtroRolUsuarios === 'pendientes') {
      perfilesFiltrados = perfiles.filter(u => u.activo === false);
    } else if (filtroRolUsuarios !== 'todos') {
      perfilesFiltrados = perfiles.filter(u => u.rol === filtroRolUsuarios);
    }

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
      const activo = u.activo !== false;
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

    const { error: rpcError } = await client.rpc('eliminar_usuario_auth', { user_id: userId });

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
    const { error: errPerfil } = await client.from('perfiles').update({ nombre: nombreLimpio }).eq('id', userId);
    if (errPerfil) throw errPerfil;

    const session = window.sgiAdminSession || {};
    if (session.userId === userId) {
      session.nombre = nombreLimpio;
      window.sgiAdminSession = session;
      localStorage.setItem('sgi_admin_session', JSON.stringify(session));
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
