'use strict';

// ── Configuración Global ─────────────────────────────────────────────────────
const API = 'https://script.google.com/macros/s/AKfycbwW2_UWpOS45F-3BbyVbUvtxIJ3b_OP_Pnl_cSgSwO-BXz9nSzqoTb8oxnh185za0M/exec';
let datosSalas = [];
let datosMaquinas = [];
let datosUsuarios = [];
let datosHistorial = [];
let isCargando = false;
let cacheSeguimientosNotas = null;
let serverHost = 'https://manuel9121231.github.io/adestacion';
let rolActual = 'admin';

async function detectarServidor() {
  // serverHost fijado a GitHub Pages — no se sobreescribe
}
