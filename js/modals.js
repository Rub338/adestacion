// ── Modales ─────────────────────────────────────────────────────────────────
function abrirModal(id) { 
  document.getElementById(id)?.classList.add('open'); 
}

function cerrarModal(id) { 
  document.getElementById(id)?.classList.remove('open'); 
}

function abrirLightbox(src) {
  const existing = document.getElementById('lightbox-overlay');
  if (existing) existing.remove();

  const lb = document.createElement('div');
  lb.id = 'lightbox-overlay';
  lb.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;cursor:default';

  const viewport = document.createElement('div');
  viewport.id = 'lightbox-viewport';
  viewport.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;box-sizing:border-box';

  const scrollStyle = document.createElement('style');
  scrollStyle.id = 'lightbox-scrollbar-style';
  scrollStyle.textContent = `
    #lightbox-viewport::-webkit-scrollbar { width: 12px; height: 12px; }
    #lightbox-viewport::-webkit-scrollbar-track { background: rgba(255,255,255,0.08); border-radius: 6px; }
    #lightbox-viewport::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.45); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    #lightbox-viewport::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.7); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    #lightbox-viewport { scrollbar-width: auto; scrollbar-color: rgba(255,255,255,0.45) rgba(255,255,255,0.08); }
  `;
  document.head.appendChild(scrollStyle);

  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'display:block;max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in';

  viewport.appendChild(img);

  const bar = document.createElement('div');
  bar.style.cssText = 'flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,0.7);padding:10px 16px';

  function mkBtn(html, title) {
    const b = document.createElement('button');
    b.innerHTML = html;
    b.title = title;
    b.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;font-size:18px;cursor:pointer;line-height:1';
    return b;
  }

  const btnZoomIn  = mkBtn('+', 'Ampliar');
  const btnZoomOut = mkBtn('−', 'Reducir');
  const btnClose   = document.createElement('button');
  btnClose.innerHTML = '✕&nbsp;Cerrar';
  btnClose.style.cssText = 'background:#fff;border:none;color:#111;border-radius:8px;padding:7px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin-left:8px';

  bar.appendChild(btnZoomOut);
  bar.appendChild(btnZoomIn);
  bar.appendChild(btnClose);

  lb.appendChild(viewport);
  lb.appendChild(bar);
  document.body.appendChild(lb);

  let scale = 1;

  function fitScale() {
    return Math.min(1,
      viewport.clientWidth  / img.naturalWidth,
      viewport.clientHeight / img.naturalHeight
    );
  }

  function applyZoom(newScale, focalX, focalY) {
    const oldScale = scale;
    scale = Math.max(fitScale() * 0.9, Math.min(8, newScale));
    const w = Math.round(img.naturalWidth  * scale);
    const h = Math.round(img.naturalHeight * scale);

    if (scale <= fitScale() * 1.01) {
      viewport.style.overflow       = 'hidden';
      viewport.style.alignItems     = 'center';
      viewport.style.justifyContent = 'center';
      img.style.width     = '';
      img.style.height    = '';
      img.style.maxWidth  = '100%';
      img.style.maxHeight = '100%';
      img.style.margin    = '';
      img.style.cursor    = 'zoom-in';
    } else {
      const wasZoomed = oldScale > fitScale() * 1.01;

      let ratioX = 0.5, ratioY = 0.5;
      if (wasZoomed && focalX !== undefined) {
        const cx = focalX - viewport.getBoundingClientRect().left;
        const cy = focalY - viewport.getBoundingClientRect().top;
        const totalW = img.naturalWidth  * oldScale;
        const totalH = img.naturalHeight * oldScale;
        const marginX = Math.max(0, (viewport.clientWidth  - totalW) / 2);
        const marginY = Math.max(0, (viewport.clientHeight - totalH) / 2);
        ratioX = (viewport.scrollLeft + cx - marginX) / totalW;
        ratioY = (viewport.scrollTop  + cy - marginY) / totalH;
      } else if (!wasZoomed) {
        ratioX = 0.5; ratioY = 0.5;
      } else {
        const totalW = img.naturalWidth  * oldScale;
        const totalH = img.naturalHeight * oldScale;
        const marginX = Math.max(0, (viewport.clientWidth  - totalW) / 2);
        const marginY = Math.max(0, (viewport.clientHeight - totalH) / 2);
        ratioX = (viewport.scrollLeft + viewport.clientWidth  / 2 - marginX) / totalW;
        ratioY = (viewport.scrollTop  + viewport.clientHeight / 2 - marginY) / totalH;
      }

      viewport.style.overflow       = 'auto';
      viewport.style.alignItems     = 'flex-start';
      viewport.style.justifyContent = 'flex-start';
      img.style.maxWidth  = 'none';
      img.style.maxHeight = 'none';
      img.style.width     = w + 'px';
      img.style.height    = h + 'px';
      img.style.margin    = '0 auto';
      img.style.cursor    = 'zoom-out';

      requestAnimationFrame(() => {
        const newMarginX = Math.max(0, (viewport.clientWidth  - w) / 2);
        const newMarginY = Math.max(0, (viewport.clientHeight - h) / 2);
        const cx = focalX !== undefined ? focalX - viewport.getBoundingClientRect().left : viewport.clientWidth  / 2;
        const cy = focalY !== undefined ? focalY - viewport.getBoundingClientRect().top  : viewport.clientHeight / 2;
        viewport.scrollLeft = newMarginX + ratioX * w - cx;
        viewport.scrollTop  = newMarginY + ratioY * h - cy;
      });
    }
  }

  img.addEventListener('load', () => applyZoom(fitScale()), { once: true });
  if (img.complete && img.naturalWidth) applyZoom(fitScale());

  img.addEventListener('click', e => {
    e.stopPropagation();
    applyZoom(scale <= fitScale() * 1.01 ? 1 : fitScale(), e.clientX, e.clientY);
  });

  btnZoomIn.addEventListener('click',  e => { e.stopPropagation(); applyZoom(scale * 1.5); });
  btnZoomOut.addEventListener('click', e => { e.stopPropagation(); applyZoom(scale / 1.5); });
  btnClose.addEventListener('click', closeLb);

  lb.addEventListener('click', e => { if (e.target === lb || e.target === viewport) closeLb(); });

  function escHandler(e) { if (e.key === 'Escape') closeLb(); }
  document.addEventListener('keydown', escHandler);

  function closeLb() {
    lb.remove();
    document.getElementById('lightbox-scrollbar-style')?.remove();
    document.removeEventListener('keydown', escHandler);
  }
}

document.querySelectorAll('.overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }));
