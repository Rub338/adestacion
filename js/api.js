// ── API Wrapper ─────────────────────────────────────────────────────────────
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
    return { ok: false, error: err.message };
  }
}
