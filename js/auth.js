// ── Autenticación y Roles ─────────────────────────────────────────────────────
async function cargarRolUsuario() {
  try {
    const adminSessionStr = localStorage.getItem('sgi_admin_session');
    console.log('DEBUG - admin_session:', adminSessionStr);
    if (adminSessionStr) {
      const adminSession = JSON.parse(adminSessionStr);
      if (adminSession.type === 'superadmin') {
        rolActual = 'admin';
      } else if (adminSession.type) {
        rolActual = adminSession.type;
      } else if (adminSession.username || adminSession.nombre) {
        rolActual = 'admin';
      }
      console.log('DEBUG - Rol asignado desde admin_session:', rolActual);
      return;
    }

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

function formatearRol(rol) {
  const map = { usuario: 'Usuario', admin: 'Administrador', tecnico: 'Técnico', superadmin: 'Administrador' };
  return map[rol] || (rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : 'Usuario');
}

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

function isAdminLoggedIn() {
  return localStorage.getItem('sgi_admin_session') !== null;
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
