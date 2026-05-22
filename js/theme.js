(function() {
  // Definir función global para cambiar tema
  window.toggleTheme = function() {
    document.body.classList.add('no-transition');
    const isDark = document.body.classList.toggle('dark-mode');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('sgi_theme', newTheme);

    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.textContent = isDark ? 'Tema claro' : 'Tema oscuro';
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('no-transition');
      });
    });
  };

  // Inicializar tema inmediatamente (antes de DOMContentLoaded)
  const savedTheme = localStorage.getItem('sgi_theme');
  const isDark = savedTheme === 'dark';

  // Función para aplicar tema al body
  function applyTheme() {
    if (document.body) {
      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }

    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.textContent = isDark ? 'Tema claro' : 'Tema oscuro';
    }
  }

  // Aplicar inmediatamente si body ya existe
  if (document.body) {
    applyTheme();
  }

  // También aplicar cuando DOM esté listo
  document.addEventListener('DOMContentLoaded', applyTheme);
})();
