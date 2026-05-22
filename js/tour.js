// ── Tour Guiado ─────────────────────────────────────────────────────────────
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
      {
        popover: {
          title: 'Bienvenido al Sistema de Gestión',
          description: 'Este recorrido te explicará cómo funciona el sistema antes de mostrarte cada sección. Usa los botones para avanzar.'
        },
        onHighlightStarted: () => navigateTo('dashboard')
      },
      {
        popover: {
          title: 'Las dos páginas del sistema',
          description: '<strong>Panel de Administración</strong> (aquí): gestión interna completa — incidencias, máquinas, usuarios y QRs.<br><br><strong>Estado de Equipos</strong> (página pública): vista en tiempo real del estado de todas las máquinas, pensada para mostrarse en pantallas o consultarse rápidamente sin necesidad de iniciar sesión.'
        }
      },
      {
        popover: {
          title: 'Estados de una Incidencia',
          description: '<strong style="color:#dc2626">● Sin resolver</strong> — el usuario ha reportado el problema y aún no se ha atendido.<br><br><strong style="color:#d97706">● En seguimiento</strong> — un técnico o admin está trabajando en ello y ha dejado notas de progreso.<br><br><strong style="color:#16a34a">● Resuelta</strong> — la incidencia ha sido cerrada y la máquina vuelve a estar operativa.'
        }
      },
      {
        popover: {
          title: 'Estados de una Máquina',
          description: '<strong style="color:#16a34a">● Activa</strong> — la máquina está operativa y disponible para su uso.<br><br><strong style="color:#6b7280">● Inactiva</strong> — la máquina está desconectada, retirada o fuera de servicio de forma indefinida. No aparece como disponible en el portal de reportes.'
        }
      },
      {
        popover: {
          title: 'Roles de Usuario',
          description: '<strong style="color:#dc2626">Usuario</strong> — solo puede reportar incidencias desde el portal de reportes. Sin acceso al panel.<br><br><strong style="color:#16a34a">Técnico</strong> — accede al panel para ver máquinas e incidencias, añadir notas de seguimiento y cambiar el estado operativo de una máquina (activa/inactiva). No puede crear máquinas ni gestionar usuarios.<br><br><strong style="color:#3b82f6">Administrador</strong> — acceso completo: gestiona máquinas, salas, usuarios y toda la configuración del sistema.'
        }
      },
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
      {
        element: '#nav-incidencias',
        popover: {
          title: 'Sección: Incidencias',
          description: 'Desde aquí accedes al panel completo de incidencias. Haz clic para abrir la sección en cualquier momento.'
        },
        onHighlightStarted: () => navigateTo('incidencias')
      },
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
      {
        element: '#nav-maquinas',
        popover: {
          title: 'Sección: Máquinas y Salas',
          description: 'Gestiona el inventario completo de máquinas e impresoras, agrupadas por salas.'
        },
        onHighlightStarted: () => navigateTo('maquinas')
      },
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
      {
        element: '#nav-qrcodes',
        popover: {
          title: 'Sección: Códigos QR',
          description: 'Genera QRs individuales por máquina para que los usuarios reporten incidencias escaneando desde el móvil.'
        },
        onHighlightStarted: () => navigateTo('qrcodes')
      },
      {
        element: '#gridQRs',
        popover: {
          title: 'QRs de Máquinas',
          description: 'Cada máquina tiene su propio QR único. Imprímelos y colócalos físicamente junto al equipo. Al escanear, la máquina queda preseleccionada en el formulario de reporte del usuario.'
        },
        onHighlightStarted: () => refresco()
      },
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
