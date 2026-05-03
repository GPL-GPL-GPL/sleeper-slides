(function () {
  'use strict';

  const STORAGE_KEY = 'sleeper-slides-v1';

  // ── STORAGE ──────────────────────────────────────────────────────────
  function loadSlides() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.main) && Array.isArray(parsed.sleeper)) return parsed;
      }
    } catch (e) { console.warn('Load failed', e); }
    const seed = window.INITIAL_SLIDES || { main: [], sleeper: [] };
    return { main: seed.main.map(s => ({ ...s, elements: s.elements || [] })), sleeper: seed.sleeper.map(s => ({ ...s, elements: s.elements || [] })) };
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ main: state.mainSlides, sleeper: state.sleeperSlides })); }
    catch (e) { console.warn('Persist failed', e); }
  }

  // ── STATE ────────────────────────────────────────────────────────────
  const initial = loadSlides();
  const state = {
    mainSlides: initial.main,
    sleeperSlides: initial.sleeper,
    currentMainIndex: 0,
    inSleeperMode: false,
    currentSleeperQueue: [],
    currentSleeperIndex: 0,
    savedMainIndex: 0,
    isPresenting: false,
    modalIsSleeper: false,
    gridEnabled: false,
    gridSize: 5,
    selectedElementId: null,
    clipboard: null,
    history: [],
    historyIndex: -1,
    fsAnimQueue: [],
    fsAnimIndex: 0,
  };

  const $ = (id) => document.getElementById(id);

  // ── HISTORY (UNDO/REDO) ───────────────────────────────────────────────
  function pushHistory() {
    state.history = state.history.slice(0, state.historyIndex + 1);
    const snap = JSON.parse(JSON.stringify({ main: state.mainSlides, sleeper: state.sleeperSlides }));
    state.history.push(snap);
    if (state.history.length > 60) state.history.shift();
    state.historyIndex = state.history.length - 1;
  }

  function restoreHistory(snap) {
    state.mainSlides = JSON.parse(JSON.stringify(snap.main));
    state.sleeperSlides = JSON.parse(JSON.stringify(snap.sleeper));
    state.selectedElementId = null;
    persist();
    render();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    restoreHistory(state.history[state.historyIndex]);
    showToast('Undone');
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    restoreHistory(state.history[state.historyIndex]);
    showToast('Redone');
  }

  // Push initial state
  function initHistory() {
    pushHistory();
  }

  // ── SLIDE HELPERS ────────────────────────────────────────────────────
  function currentSlide() {
    if (state.inSleeperMode) return state.currentSleeperQueue[state.currentSleeperIndex] || null;
    return state.mainSlides[state.currentMainIndex] || null;
  }

  function ensureElements(slide) {
    if (!slide.elements) slide.elements = [];
    return slide.elements;
  }

  function fillSlideContent(host, slide, opts = {}) {
    host.replaceChildren();
    if (opts.sleeperTag) {
      const tag = document.createElement('div');
      tag.className = 'sleeper-tag';
      tag.textContent = `${opts.sleeperTag} · ${slide.code}`;
      host.appendChild(tag);
    }
    const h1 = document.createElement('h1');
    h1.textContent = slide.title;
    host.appendChild(h1);
    const p = document.createElement('p');
    p.textContent = slide.body;
    host.appendChild(p);
  }

  // ── ELEMENT HELPERS ──────────────────────────────────────────────────
  function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

  function snapVal(v) {
    const c = Math.max(0, Math.min(100, v));
    if (!state.gridEnabled) return c;
    return Math.round(c / state.gridSize) * state.gridSize;
  }

  function clearElementSelection() { state.selectedElementId = null; }

  function defaultElement(type, extra = {}) {
    return {
      id: uid(), type,
      x: 15, y: 20, w: 60, h: 30,
      opacity: 1, rotation: 0,
      fillColor: 'transparent',
      borderColor: 'transparent', borderWidth: 0,
      animType: 'none', animTrigger: 'auto',
      ...extra,
    };
  }

  function defaultTextEl() {
    return defaultElement('text', {
      content: 'Text',
      fontFamily: "'Playfair Display', serif",
      fontSize: 20, bold: false, italic: false, underline: false,
      textColor: '#1a1612', textAlign: 'center',
    });
  }

  function defaultShapeEl(type) {
    return defaultElement(type, {
      fillColor: 'rgba(196,98,45,0.12)',
      borderColor: '#c4622d', borderWidth: 2,
    });
  }

  // ── GRID ─────────────────────────────────────────────────────────────
  function toggleGrid() {
    state.gridEnabled = !state.gridEnabled;
    $('slideCanvas').classList.toggle('grid-on', state.gridEnabled);
    $('gridToggleBtn').classList.toggle('active', state.gridEnabled);
  }

  // ── ELEMENT: ADD ─────────────────────────────────────────────────────
  function addElement(el) {
    const slide = currentSlide();
    if (!slide) { showToast('Add a slide first'); return; }
    pushHistory();
    ensureElements(slide).push(el);
    state.selectedElementId = el.id;
    persist();
    renderElements();
    renderFormatBar();
  }

  function addTextElement() { addElement(defaultTextEl()); }
  function addRectElement() { addElement(defaultShapeEl('rect')); }
  function addCircleElement() { addElement(defaultShapeEl('circle')); }
  function addImageElement() { const s = currentSlide(); if (!s) { showToast('Add a slide first'); return; } $('imageFileInput').click(); }

  function openVideoModal() {
    if (!currentSlide()) { showToast('Add a slide first'); return; }
    $('videoUrlField').value = '';
    $('videoModal').classList.add('visible');
    $('videoUrlField').focus();
  }
  function closeVideoModal() { $('videoModal').classList.remove('visible'); }

  function addVideoFromUrl() {
    const raw = $('videoUrlField').value.trim();
    if (!raw) return;
    let src = raw;
    const yt = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) src = `https://www.youtube.com/embed/${yt[1]}?rel=0`;
    const vm = raw.match(/vimeo\.com\/(\d+)/);
    if (vm) src = `https://player.vimeo.com/video/${vm[1]}`;
    addElement(defaultElement('video', { src, srcType: 'url', w: 60, h: 45 }));
    closeVideoModal();
    showToast('Video embedded');
  }

  function onImageFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      addElement(defaultElement('image', { src: ev.target.result, w: 50, h: 40 }));
      showToast('Image added');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function onVideoFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    addElement(defaultElement('video', { src: URL.createObjectURL(file), srcType: 'file', w: 60, h: 45 }));
    closeVideoModal();
    showToast('Video added');
    e.target.value = '';
  }

  // ── ELEMENT: DELETE ───────────────────────────────────────────────────
  function deleteSelectedElement() {
    if (!state.selectedElementId) return;
    const slide = currentSlide();
    if (!slide?.elements) return;
    pushHistory();
    slide.elements = slide.elements.filter(el => el.id !== state.selectedElementId);
    state.selectedElementId = null;
    persist();
    renderElements();
    renderFormatBar();
  }

  // ── ELEMENT: DUPLICATE & COPY/PASTE ──────────────────────────────────
  function duplicateElement() {
    const slide = currentSlide();
    if (!slide?.elements || !state.selectedElementId) return;
    const orig = slide.elements.find(el => el.id === state.selectedElementId);
    if (!orig) return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = uid();
    copy.x = Math.min(90, orig.x + 3);
    copy.y = Math.min(90, orig.y + 3);
    slide.elements.push(copy);
    state.selectedElementId = copy.id;
    persist();
    renderElements();
    renderFormatBar();
  }

  function copyElement() {
    const slide = currentSlide();
    if (!slide?.elements || !state.selectedElementId) return;
    const el = slide.elements.find(e => e.id === state.selectedElementId);
    if (!el) return;
    state.clipboard = JSON.parse(JSON.stringify(el));
    showToast('Copied');
  }

  function pasteElement() {
    if (!state.clipboard) return;
    const slide = currentSlide();
    if (!slide) return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(state.clipboard));
    copy.id = uid();
    copy.x = Math.min(90, copy.x + 4);
    copy.y = Math.min(90, copy.y + 4);
    ensureElements(slide).push(copy);
    state.selectedElementId = copy.id;
    persist();
    renderElements();
    renderFormatBar();
    showToast('Pasted');
  }

  // ── ELEMENT: Z-ORDER ──────────────────────────────────────────────────
  function bringToFront() {
    const slide = currentSlide();
    if (!slide?.elements || !state.selectedElementId) return;
    pushHistory();
    const idx = slide.elements.findIndex(el => el.id === state.selectedElementId);
    if (idx < 0 || idx === slide.elements.length - 1) return;
    const [el] = slide.elements.splice(idx, 1);
    slide.elements.push(el);
    persist();
    renderElements();
  }

  function sendToBack() {
    const slide = currentSlide();
    if (!slide?.elements || !state.selectedElementId) return;
    pushHistory();
    const idx = slide.elements.findIndex(el => el.id === state.selectedElementId);
    if (idx <= 0) return;
    const [el] = slide.elements.splice(idx, 1);
    slide.elements.unshift(el);
    persist();
    renderElements();
  }

  // ── ELEMENT: FORMAT UPDATE ─────────────────────────────────────────────
  function updateEl(props) {
    const slide = currentSlide();
    if (!slide?.elements || !state.selectedElementId) return;
    const el = slide.elements.find(e => e.id === state.selectedElementId);
    if (!el) return;
    Object.assign(el, props);
    persist();
    // Update DOM directly to avoid losing focus
    applyElStyle(el);
  }

  function applyElStyle(elData) {
    const wrapper = $('slideCanvas').querySelector(`[data-id="${elData.id}"]`);
    if (!wrapper) { renderElements(); return; }
    wrapper.style.opacity = elData.opacity ?? 1;
    wrapper.style.transform = `rotate(${elData.rotation ?? 0}deg)`;
    if (elData.type === 'text') {
      wrapper.style.background = elData.fillColor || 'transparent';
      wrapper.style.border = elData.borderWidth ? `${elData.borderWidth}px solid ${elData.borderColor || 'transparent'}` : 'none';
      const div = wrapper.querySelector('.element-text');
      if (div) {
        div.style.fontFamily = elData.fontFamily || "'Playfair Display', serif";
        div.style.fontSize = (elData.fontSize || 16) + 'px';
        div.style.fontWeight = elData.bold ? '700' : '400';
        div.style.fontStyle = elData.italic ? 'italic' : 'normal';
        div.style.textDecoration = elData.underline ? 'underline' : 'none';
        div.style.color = elData.textColor || '#1a1612';
        div.style.textAlign = elData.textAlign || 'center';
      }
    } else if (elData.type === 'rect' || elData.type === 'circle') {
      wrapper.style.background = elData.fillColor || 'transparent';
      wrapper.style.border = `${elData.borderWidth || 0}px solid ${elData.borderColor || 'transparent'}`;
    }
  }

  // ── FORMAT BAR ────────────────────────────────────────────────────────
  function renderFormatBar() {
    const bar = $('formatBar');
    const slide = currentSlide();

    bar.replaceChildren();

    // No element selected → show slide properties
    if (!state.selectedElementId || !slide) {
      if (slide) {
        bar.classList.add('visible');
        appendSlideProps(bar, slide);
      } else {
        bar.classList.remove('visible');
      }
      return;
    }

    const el = slide.elements?.find(e => e.id === state.selectedElementId);
    if (!el) { bar.classList.remove('visible'); return; }

    bar.classList.add('visible');

    // Text formatting
    if (el.type === 'text') {
      // Font family
      const fontSel = mkSelect([
        ["'Playfair Display', serif", 'Playfair'],
        ["'Inter', sans-serif", 'Inter'],
        ["'Space Mono', monospace", 'Mono'],
        ['Georgia, serif', 'Georgia'],
      ], el.fontFamily || "'Playfair Display', serif", v => { pushHistory(); updateEl({ fontFamily: v }); });
      bar.appendChild(fontSel);

      // Font size
      const sizeSel = mkSelect(
        [10,12,14,16,18,20,24,28,32,36,40,48,56,64,72].map(n => [n, n]),
        el.fontSize || 20,
        v => { pushHistory(); updateEl({ fontSize: Number(v) }); }
      );
      sizeSel.style.width = '52px';
      bar.appendChild(sizeSel);

      sep(bar);

      // B I U
      bar.appendChild(mkFmtBtn('B', el.bold, 'bold', () => { pushHistory(); updateEl({ bold: !el.bold }); renderFormatBar(); }));
      bar.appendChild(mkFmtBtn('I', el.italic, 'italic', () => { pushHistory(); updateEl({ italic: !el.italic }); renderFormatBar(); }));
      bar.appendChild(mkFmtBtn('U̲', el.underline, 'underline', () => { pushHistory(); updateEl({ underline: !el.underline }); renderFormatBar(); }));

      sep(bar);

      // Alignment
      bar.appendChild(mkFmtBtn('≡L', el.textAlign === 'left', 'align-left', () => { pushHistory(); updateEl({ textAlign: 'left' }); renderFormatBar(); }));
      bar.appendChild(mkFmtBtn('≡C', el.textAlign === 'center' || !el.textAlign, 'align-center', () => { pushHistory(); updateEl({ textAlign: 'center' }); renderFormatBar(); }));
      bar.appendChild(mkFmtBtn('≡R', el.textAlign === 'right', 'align-right', () => { pushHistory(); updateEl({ textAlign: 'right' }); renderFormatBar(); }));

      sep(bar);

      // Text color
      bar.appendChild(mkLabel('Text'));
      bar.appendChild(mkColorInput(el.textColor || '#1a1612', v => { pushHistory(); updateEl({ textColor: v }); }));
    }

    // Fill (text, rect, circle)
    if (['text', 'rect', 'circle'].includes(el.type)) {
      sep(bar);
      bar.appendChild(mkLabel('Fill'));
      bar.appendChild(mkColorInput(el.fillColor === 'transparent' ? '#faf7f2' : el.fillColor || '#faf7f2', v => { pushHistory(); updateEl({ fillColor: v }); }));
      bar.appendChild(mkFmtBtn('None', el.fillColor === 'transparent', 'fill-none', () => { pushHistory(); updateEl({ fillColor: 'transparent' }); renderFormatBar(); }));

      sep(bar);
      bar.appendChild(mkLabel('Border'));
      bar.appendChild(mkColorInput(el.borderColor === 'transparent' ? '#c4622d' : el.borderColor || '#c4622d', v => { pushHistory(); updateEl({ borderColor: v }); }));
      const bwSel = mkSelect([[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[6,'6']], el.borderWidth ?? 0, v => { pushHistory(); updateEl({ borderWidth: Number(v) }); });
      bwSel.style.width = '44px';
      bar.appendChild(bwSel);
    }

    sep(bar);

    // Opacity
    bar.appendChild(mkLabel('Opacity'));
    const opSel = mkSelect([[1,'100%'],[0.9,'90%'],[0.8,'80%'],[0.7,'70%'],[0.6,'60%'],[0.5,'50%'],[0.3,'30%'],[0.1,'10%']], el.opacity ?? 1, v => { pushHistory(); updateEl({ opacity: Number(v) }); });
    bar.appendChild(opSel);

    // Rotation
    bar.appendChild(mkLabel('Rotate'));
    const rotIn = document.createElement('input');
    rotIn.type = 'number'; rotIn.className = 'fmt-number';
    rotIn.value = Math.round(el.rotation || 0); rotIn.min = -180; rotIn.max = 180; rotIn.step = 5;
    rotIn.title = 'Rotation in degrees';
    rotIn.addEventListener('change', () => { pushHistory(); updateEl({ rotation: Number(rotIn.value) }); });
    bar.appendChild(rotIn);

    sep(bar);

    // Z-order
    bar.appendChild(mkFmtBtn('↑ Front', false, 'front', bringToFront));
    bar.appendChild(mkFmtBtn('↓ Back', false, 'back', sendToBack));

    sep(bar);

    // Duplicate
    bar.appendChild(mkFmtBtn('⧉ Dup', false, 'dup', duplicateElement));

    sep(bar);

    // Animation
    bar.appendChild(mkLabel('Anim'));
    const animSel = mkSelect([
      ['none','None'],['fade','Fade'],['flyUp','Fly Up'],
      ['flyLeft','Fly Left'],['flyRight','Fly Right'],['scale','Scale'],
    ], el.animType || 'none', v => { pushHistory(); updateEl({ animType: v }); });
    bar.appendChild(animSel);

    if (el.animType && el.animType !== 'none') {
      const trigSel = mkSelect([['auto','On Enter'],['click','On Click']], el.animTrigger || 'auto', v => { pushHistory(); updateEl({ animTrigger: v }); });
      bar.appendChild(trigSel);
    }
  }

  function appendSlideProps(bar, slide) {
    bar.appendChild(mkLabel('Slide BG'));
    bar.appendChild(mkColorInput(slide.bgColor || '#faf7f2', v => {
      pushHistory();
      slide.bgColor = v;
      $('slideCanvas').style.background = v;
      persist();
    }));
    bar.appendChild(mkFmtBtn('Reset', false, 'bg-reset', () => {
      pushHistory();
      slide.bgColor = '';
      $('slideCanvas').style.background = '';
      persist();
      renderFormatBar();
    }));

    sep(bar);

    bar.appendChild(mkLabel('Transition'));
    const trSel = mkSelect([['none','None'],['fade','Fade']], slide.transition || 'none', v => {
      slide.transition = v;
      persist();
    });
    bar.appendChild(trSel);
  }

  // Format bar helpers
  function mkLabel(text) {
    const s = document.createElement('span');
    s.className = 'fmt-label';
    s.textContent = text;
    return s;
  }

  function sep(bar) {
    const d = document.createElement('div');
    d.className = 'tool-sep';
    bar.appendChild(d);
  }

  function mkFmtBtn(label, isOn, key, onClick) {
    const btn = document.createElement('button');
    btn.className = 'fmt-btn' + (isOn ? ' on' : '');
    btn.textContent = label;
    btn.dataset.fmtKey = key;
    btn.addEventListener('mousedown', e => { e.preventDefault(); onClick(); });
    return btn;
  }

  function mkSelect(options, value, onChange) {
    const sel = document.createElement('select');
    sel.className = 'fmt-select';
    options.forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (String(val) === String(value)) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  function mkColorInput(value, onChange) {
    const inp = document.createElement('input');
    inp.type = 'color'; inp.className = 'fmt-color';
    inp.value = value.startsWith('rgba') ? '#c4622d' : (value.startsWith('#') ? value : '#c4622d');
    inp.addEventListener('input', () => onChange(inp.value));
    return inp;
  }

  // ── DRAG & RESIZE ─────────────────────────────────────────────────────
  let dragState = null;

  function onElementMouseDown(e) {
    if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) return;
    if (e.target.classList.contains('element-text') && state.selectedElementId === e.currentTarget.dataset.id) return;
    e.preventDefault(); e.stopPropagation();
    const wrapper = e.currentTarget;
    const id = wrapper.dataset.id;
    if (state.selectedElementId !== id) {
      state.selectedElementId = id;
      renderElements();
      renderFormatBar();
    }
    const canvas = $('slideCanvas');
    const rect = canvas.getBoundingClientRect();
    const slide = currentSlide();
    const elData = slide.elements.find(el => el.id === id);
    dragState = {
      type: 'move', id, elData,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startElX: elData.x, startElY: elData.y,
      canvasW: rect.width, canvasH: rect.height,
    };
  }

  function onResizeMouseDown(e) {
    e.preventDefault(); e.stopPropagation();
    const handle = e.currentTarget.dataset.handle;
    const wrapper = e.currentTarget.parentElement;
    const id = wrapper.dataset.id;
    const canvas = $('slideCanvas');
    const rect = canvas.getBoundingClientRect();
    const slide = currentSlide();
    const elData = slide.elements.find(el => el.id === id);
    dragState = {
      type: 'resize', handle, id, elData,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startElX: elData.x, startElY: elData.y,
      startElW: elData.w, startElH: elData.h,
      canvasW: rect.width, canvasH: rect.height,
    };
  }

  function onRotateMouseDown(e) {
    e.preventDefault(); e.stopPropagation();
    const wrapper = e.currentTarget.parentElement;
    const id = wrapper.dataset.id;
    const canvas = $('slideCanvas');
    const rect = canvas.getBoundingClientRect();
    const elRect = wrapper.getBoundingClientRect();
    const cx = elRect.left + elRect.width / 2 - rect.left;
    const cy = elRect.top + elRect.height / 2 - rect.top;
    const slide = currentSlide();
    const elData = slide.elements.find(el => el.id === id);
    dragState = {
      type: 'rotate', id, elData, cx, cy,
      canvasLeft: rect.left, canvasTop: rect.top,
    };
  }

  function onDocMouseMove(e) {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startMouseX) / dragState.canvasW * 100;
    const dy = (e.clientY - dragState.startMouseY) / dragState.canvasH * 100;
    const el = dragState.elData;

    if (dragState.type === 'move') {
      el.x = snapVal(dragState.startElX + dx);
      el.y = snapVal(dragState.startElY + dy);
      const wrapper = $('slideCanvas').querySelector(`[data-id="${el.id}"]`);
      if (wrapper) { wrapper.style.left = el.x + '%'; wrapper.style.top = el.y + '%'; }
    } else if (dragState.type === 'resize') {
      const h = dragState.handle;
      if (h.includes('e')) el.w = Math.max(5, snapVal(dragState.startElW + dx));
      if (h.includes('s')) el.h = Math.max(5, snapVal(dragState.startElH + dy));
      if (h.includes('w')) { const nx = snapVal(dragState.startElX + dx); const nw = dragState.startElW - (nx - dragState.startElX); if (nw >= 5) { el.w = nw; el.x = nx; } }
      if (h.includes('n')) { const ny = snapVal(dragState.startElY + dy); const nh = dragState.startElH - (ny - dragState.startElY); if (nh >= 5) { el.h = nh; el.y = ny; } }
      const wrapper = $('slideCanvas').querySelector(`[data-id="${el.id}"]`);
      if (wrapper) { wrapper.style.left = el.x + '%'; wrapper.style.top = el.y + '%'; wrapper.style.width = el.w + '%'; wrapper.style.height = el.h + '%'; }
    } else if (dragState.type === 'rotate') {
      const mx = e.clientX - dragState.canvasLeft;
      const my = e.clientY - dragState.canvasTop;
      const angle = Math.atan2(my - dragState.cy, mx - dragState.cx) * 180 / Math.PI + 90;
      el.rotation = Math.round(angle / 5) * 5;
      const wrapper = $('slideCanvas').querySelector(`[data-id="${el.id}"]`);
      if (wrapper) wrapper.style.transform = `rotate(${el.rotation}deg)`;
    }
  }

  function onDocMouseUp() {
    if (!dragState) return;
    pushHistory();
    persist();
    dragState = null;
    renderFormatBar();
  }

  function onCanvasClick(e) {
    const canvas = $('slideCanvas');
    if (e.target === canvas || e.target === $('slideContent') || e.target.tagName === 'H1' || e.target.tagName === 'P') {
      if (state.selectedElementId) {
        state.selectedElementId = null;
        renderElements();
        renderFormatBar();
      } else {
        renderFormatBar();
      }
    }
  }

  // ── ELEMENT: BUILD DOM ────────────────────────────────────────────────
  function buildElementDOM(container, elData, readonly, anim = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slide-element';
    wrapper.dataset.id = elData.id;
    if (!readonly && state.selectedElementId === elData.id) wrapper.classList.add('selected');
    wrapper.style.left = elData.x + '%';
    wrapper.style.top = elData.y + '%';
    wrapper.style.width = elData.w + '%';
    wrapper.style.height = elData.h + '%';
    wrapper.style.opacity = elData.opacity ?? 1;
    wrapper.style.transform = `rotate(${elData.rotation ?? 0}deg)`;
    if (elData.rotation) wrapper.style.setProperty('--el-rotation', `${elData.rotation}deg`);

    const type = elData.type;

    if (type === 'text') {
      wrapper.style.background = elData.fillColor || 'transparent';
      if (elData.borderWidth) wrapper.style.border = `${elData.borderWidth}px solid ${elData.borderColor || 'transparent'}`;
      const div = document.createElement('div');
      div.className = 'element-text';
      div.style.fontFamily = elData.fontFamily || "'Playfair Display', serif";
      div.style.fontSize = (elData.fontSize || 16) + 'px';
      div.style.fontWeight = elData.bold ? '700' : '400';
      div.style.fontStyle = elData.italic ? 'italic' : 'normal';
      div.style.textDecoration = elData.underline ? 'underline' : 'none';
      div.style.color = elData.textColor || '#1a1612';
      div.style.textAlign = elData.textAlign || 'center';
      div.contentEditable = readonly ? 'false' : 'true';
      div.textContent = elData.content || '';
      if (!readonly) {
        div.addEventListener('blur', () => { pushHistory(); elData.content = div.textContent; persist(); });
        div.addEventListener('mousedown', e => e.stopPropagation());
        div.addEventListener('dblclick', e => { e.stopPropagation(); div.focus(); });
      }
      wrapper.appendChild(div);

    } else if (type === 'rect') {
      wrapper.style.background = elData.fillColor || 'rgba(196,98,45,0.12)';
      wrapper.style.border = `${elData.borderWidth || 2}px solid ${elData.borderColor || '#c4622d'}`;
      wrapper.style.borderRadius = '3px';

    } else if (type === 'circle') {
      wrapper.style.background = elData.fillColor || 'rgba(196,98,45,0.12)';
      wrapper.style.border = `${elData.borderWidth || 2}px solid ${elData.borderColor || '#c4622d'}`;
      wrapper.style.borderRadius = '50%';

    } else if (type === 'image') {
      const img = document.createElement('img');
      img.src = elData.src; img.alt = ''; img.draggable = false;
      img.style.objectFit = 'contain';
      wrapper.appendChild(img);

    } else if (type === 'video') {
      if (elData.srcType === 'url') {
        const iframe = document.createElement('iframe');
        iframe.src = elData.src; iframe.frameBorder = '0';
        iframe.allow = 'autoplay; encrypted-media; fullscreen'; iframe.allowFullscreen = true;
        wrapper.appendChild(iframe);
      } else {
        const video = document.createElement('video');
        video.src = elData.src; video.controls = !readonly; video.style.objectFit = 'contain';
        if (!readonly) video.addEventListener('click', e => e.stopPropagation());
        wrapper.appendChild(video);
      }
    }

    // Animation classes (fullscreen only)
    if (anim && elData.animType && elData.animType !== 'none') {
      if (elData.animTrigger === 'click') {
        wrapper.classList.add('el-anim-pending');
        wrapper.dataset.animClass = `el-anim-${elData.animType}`;
      } else {
        wrapper.classList.add(`el-anim-${elData.animType}`);
      }
    }

    // Edit-mode interactivity
    if (!readonly) {
      wrapper.addEventListener('mousedown', onElementMouseDown);
      if (state.selectedElementId === elData.id) {
        ['nw','ne','se','sw'].forEach(dir => {
          const handle = document.createElement('div');
          handle.className = `resize-handle resize-${dir}`;
          handle.dataset.handle = dir;
          handle.addEventListener('mousedown', onResizeMouseDown);
          wrapper.appendChild(handle);
        });
        const rotHandle = document.createElement('div');
        rotHandle.className = 'rotate-handle';
        rotHandle.title = 'Rotate';
        rotHandle.textContent = '↻';
        rotHandle.addEventListener('mousedown', onRotateMouseDown);
        wrapper.appendChild(rotHandle);
      }
    }

    container.appendChild(wrapper);
    return wrapper;
  }

  function renderElements() {
    const canvas = $('slideCanvas');
    if (!canvas) return;
    canvas.querySelectorAll('.slide-element').forEach(el => el.remove());
    const slide = currentSlide();
    if (!slide?.elements) return;
    slide.elements.forEach(el => buildElementDOM(canvas, el, false));
  }

  function renderFsElements() {
    const wrapper = $('fsCanvasWrapper');
    if (!wrapper) return;
    wrapper.querySelectorAll('.slide-element').forEach(el => el.remove());
    const slide = currentSlide();
    if (!slide?.elements) return;
    state.fsAnimQueue = [];
    slide.elements.forEach(el => {
      const dom = buildElementDOM(wrapper, el, true, true);
      if (el.animType && el.animType !== 'none' && el.animTrigger === 'click') {
        state.fsAnimQueue.push(dom);
      }
    });
    state.fsAnimIndex = 0;
    updateFsAnimHint();
  }

  function revealNextFsElement() {
    if (state.fsAnimIndex >= state.fsAnimQueue.length) return false;
    const dom = state.fsAnimQueue[state.fsAnimIndex];
    dom.classList.remove('el-anim-pending');
    dom.classList.add(dom.dataset.animClass || 'el-anim-fade');
    state.fsAnimIndex++;
    updateFsAnimHint();
    return true;
  }

  function updateFsAnimHint() {
    const hint = $('fsAnimHint');
    const remaining = state.fsAnimQueue.length - state.fsAnimIndex;
    if (remaining > 0 && !state.inSleeperMode) {
      hint.classList.add('visible');
    } else {
      hint.classList.remove('visible');
    }
  }

  // ── SLIDE BACKGROUND ──────────────────────────────────────────────────
  function applySlideBackground() {
    const slide = currentSlide();
    const canvas = $('slideCanvas');
    if (!canvas) return;
    canvas.style.background = slide?.bgColor || '';
  }

  // ── SPEAKER NOTES ─────────────────────────────────────────────────────
  function renderNotes() {
    const slide = currentSlide();
    const textarea = $('notesTextarea');
    if (textarea) textarea.value = slide?.notes || '';
  }

  function onNotesChange() {
    const slide = currentSlide();
    if (!slide) return;
    slide.notes = $('notesTextarea').value;
    persist();
  }

  // ── SLIDE MANAGEMENT ──────────────────────────────────────────────────
  function duplicateSlide(isSleeper, index) {
    pushHistory();
    const arr = isSleeper ? state.sleeperSlides : state.mainSlides;
    const copy = JSON.parse(JSON.stringify(arr[index]));
    if (!isSleeper) {
      arr.splice(index + 1, 0, copy);
      state.currentMainIndex = index + 1;
    } else {
      copy.code = copy.code + '2';
      arr.splice(index + 1, 0, copy);
    }
    persist();
    render();
    showToast('Slide duplicated');
  }

  function deleteSlide(isSleeper, index) {
    const arr = isSleeper ? state.sleeperSlides : state.mainSlides;
    if (arr.length <= 1 && !isSleeper) { showToast('Cannot delete the last slide'); return; }
    pushHistory();
    arr.splice(index, 1);
    if (!isSleeper && state.currentMainIndex >= arr.length) state.currentMainIndex = Math.max(0, arr.length - 1);
    persist();
    render();
    showToast('Slide deleted');
  }

  // ── PDF EXPORT ────────────────────────────────────────────────────────
  function exportPdf() {
    const container = $('printSlides');
    container.innerHTML = '';
    const allSlides = state.mainSlides;
    allSlides.forEach(slide => {
      const div = document.createElement('div');
      div.className = 'print-slide';
      div.style.background = slide.bgColor || 'var(--surface)';
      const content = document.createElement('div');
      content.className = 'slide-content';
      const h1 = document.createElement('h1');
      h1.textContent = slide.title; content.appendChild(h1);
      const p = document.createElement('p');
      p.textContent = slide.body; content.appendChild(p);
      div.appendChild(content);
      if (slide.elements) {
        slide.elements.forEach(el => {
          const clone = buildElementDOM(div, el, true);
          clone.style.position = 'absolute';
        });
      }
      container.appendChild(div);
    });
    setTimeout(() => {
      window.print();
      setTimeout(() => { container.innerHTML = ''; }, 1000);
    }, 100);
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  function render() {
    renderSidebar();
    renderStage();
    renderCounter();
    updateModeIndicator();
    if (state.isPresenting) renderFullscreen();
  }

  function renderSidebar() {
    const mainList = $('mainSlideList');
    const sleeperList = $('sleeperSlideList');
    mainList.replaceChildren();
    sleeperList.replaceChildren();

    state.mainSlides.forEach((slide, i) => {
      const thumb = makeThumb(false, i, slide, !state.inSleeperMode && i === state.currentMainIndex);
      mainList.appendChild(thumb);
    });
    mainList.appendChild(makeAddBtn(false));

    state.sleeperSlides.forEach((slide, i) => {
      const thumb = makeThumb(true, i, slide, state.inSleeperMode && i === state.currentSleeperIndex);
      sleeperList.appendChild(thumb);
    });
    sleeperList.appendChild(makeAddBtn(true));
  }

  function makeThumb(isSleeper, i, slide, active) {
    const thumb = document.createElement('div');
    thumb.className = 'slide-thumb' + (isSleeper ? ' sleeper-slide' : '') + (active ? ' active' : '');
    thumb.dataset.index = String(i);
    thumb.dataset.action = isSleeper ? 'preview-sleeper' : 'goto-main';

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = isSleeper ? `S${i + 1}` : String(i + 1);
    thumb.appendChild(num);

    if (isSleeper && slide.code) {
      const badge = document.createElement('span');
      badge.className = 'code-badge';
      badge.textContent = slide.code;
      thumb.appendChild(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'slide-thumb-actions';

    const dupBtn = document.createElement('button');
    dupBtn.className = 'slide-thumb-action';
    dupBtn.textContent = '⧉'; dupBtn.title = 'Duplicate';
    dupBtn.addEventListener('click', e => { e.stopPropagation(); duplicateSlide(isSleeper, i); });
    actions.appendChild(dupBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'slide-thumb-action danger';
    delBtn.textContent = '✕'; delBtn.title = 'Delete';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deleteSlide(isSleeper, i); });
    actions.appendChild(delBtn);

    thumb.appendChild(actions);
    return thumb;
  }

  function makeAddBtn(isSleeper) {
    const btn = document.createElement('button');
    btn.className = 'add-slide-btn';
    btn.textContent = '+';
    btn.dataset.action = isSleeper ? 'add-sleeper' : 'add-main';
    return btn;
  }

  function renderStage() {
    const canvas = $('slideCanvas');
    const content = $('slideContent');

    if (state.inSleeperMode) {
      const slide = state.currentSleeperQueue[state.currentSleeperIndex];
      canvas.classList.add('sleeper-mode');
      if (slide) fillSlideContent(content, slide, { sleeperTag: 'Sleeper Slide' });
    } else {
      const slide = state.mainSlides[state.currentMainIndex];
      canvas.classList.remove('sleeper-mode');
      if (slide) fillSlideContent(content, slide);
    }

    canvas.classList.toggle('grid-on', state.gridEnabled);
    $('returnBtn').classList.toggle('visible', state.inSleeperMode);

    applySlideBackground();
    renderElements();
    renderFormatBar();
    renderNotes();
  }

  function renderCounter() {
    const counter = $('slideCounter');
    if (state.inSleeperMode) {
      counter.textContent = `S${state.currentSleeperIndex + 1} / ${state.currentSleeperQueue.length}`;
      counter.classList.add('sleeper');
    } else {
      counter.textContent = `${state.currentMainIndex + 1} / ${state.mainSlides.length}`;
      counter.classList.remove('sleeper');
    }
  }

  function updateModeIndicator() {
    const el = $('modeIndicator');
    if (state.isPresenting) {
      if (state.inSleeperMode) { el.textContent = 'SLEEPER'; el.className = 'mode-indicator sleeper-active'; }
      else { el.textContent = 'PRESENTING'; el.className = 'mode-indicator presenting'; }
    } else {
      el.textContent = 'EDIT'; el.className = 'mode-indicator';
    }
  }

  // ── NAVIGATION ────────────────────────────────────────────────────────
  function goToSlide(i) {
    if (state.inSleeperMode) return;
    clearElementSelection();
    state.currentMainIndex = i;
    render();
  }

  function previewSleeper(i) {
    clearElementSelection();
    if (!state.inSleeperMode) {
      state.inSleeperMode = true;
      state.currentSleeperQueue = [state.sleeperSlides[i]];
      state.currentSleeperIndex = 0;
      state.savedMainIndex = state.currentMainIndex;
    } else {
      state.currentSleeperIndex = i;
    }
    render();
  }

  function nextSlide() {
    if (state.isPresenting) {
      // In presentation: try animation queue first
      if (state.fsAnimQueue.length > 0 && state.fsAnimIndex < state.fsAnimQueue.length) {
        revealNextFsElement(); return;
      }
    }
    if (state.inSleeperMode) {
      if (state.currentSleeperIndex < state.currentSleeperQueue.length - 1) state.currentSleeperIndex++;
      else { returnToMain(); return; }
    } else {
      if (state.currentMainIndex < state.mainSlides.length - 1) {
        clearElementSelection();
        state.currentMainIndex++;
      }
    }
    if (state.isPresenting) { renderFullscreenWithTransition(); return; }
    render();
  }

  function prevSlide() {
    if (state.inSleeperMode) {
      if (state.currentSleeperIndex > 0) state.currentSleeperIndex--;
    } else {
      if (state.currentMainIndex > 0) {
        clearElementSelection();
        state.currentMainIndex--;
      }
    }
    if (state.isPresenting) { renderFullscreenWithTransition(); return; }
    render();
  }

  function returnToMain() {
    clearElementSelection();
    state.inSleeperMode = false;
    state.currentMainIndex = state.savedMainIndex;
    state.currentSleeperQueue = [];
    state.currentSleeperIndex = 0;
    showToast('Returned to main deck');
    if (state.isPresenting) { renderFullscreen(); return; }
    render();
  }

  // ── CODE INPUT ────────────────────────────────────────────────────────
  function handleCode(code) {
    const upper = code.toUpperCase().trim();
    const matched = state.sleeperSlides.filter(s => s.code === upper);
    if (matched.length > 0) {
      state.savedMainIndex = state.currentMainIndex;
      state.inSleeperMode = true;
      state.currentSleeperQueue = matched;
      state.currentSleeperIndex = 0;
      showToast(`Sleeper invoked: ${upper}`);
      if (state.isPresenting) { renderFullscreen(); return true; }
      render();
      return true;
    }
    return false;
  }

  // ── MODAL: ADD SLIDE ──────────────────────────────────────────────────
  function openAddSlide(isSleeper) {
    state.modalIsSleeper = isSleeper;
    const toggle = $('sleeperToggle');
    toggle.classList.toggle('on', isSleeper);
    $('codeField').style.display = isSleeper ? 'block' : 'none';
    $('modalTitle').textContent = isSleeper ? 'Add Sleeper Slide' : 'Add Slide';
    $('addSlideModal').classList.add('visible');
    $('newSlideTitle').focus();
  }

  function closeModal() {
    $('addSlideModal').classList.remove('visible');
    $('newSlideTitle').value = '';
    $('newSlideBody').value = '';
    $('newSlideCode').value = '';
  }

  function addSlide() {
    const title = $('newSlideTitle').value.trim() || 'Untitled';
    const body = $('newSlideBody').value.trim() || '';
    pushHistory();
    if (state.modalIsSleeper) {
      const code = $('newSlideCode').value.trim().toUpperCase() || `SLP${state.sleeperSlides.length}`;
      state.sleeperSlides.push({ title, body, code, elements: [], notes: '' });
      showToast(`Sleeper added: ${code}`);
    } else {
      state.mainSlides.push({ title, body, elements: [], notes: '' });
      showToast('Slide added');
    }
    persist();
    closeModal();
    render();
  }

  function toggleSleeperToggle() {
    const toggle = $('sleeperToggle');
    toggle.classList.toggle('on');
    state.modalIsSleeper = toggle.classList.contains('on');
    $('codeField').style.display = state.modalIsSleeper ? 'block' : 'none';
  }

  // ── TOAST ─────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ── FULLSCREEN ────────────────────────────────────────────────────────
  function startPresentation() {
    state.isPresenting = true;
    $('fsOverlay').classList.add('visible');
    renderFullscreen();
    updateModeIndicator();
  }

  function exitPresentation() {
    state.isPresenting = false;
    $('fsOverlay').classList.remove('visible');
    updateModeIndicator();
  }

  function renderFullscreen() {
    const content = $('fsSlideContent');
    const counter = $('fsCounter');
    const indicator = $('fsIndicator');
    const returnBtn = $('fsReturnBtn');
    const wrapper = $('fsCanvasWrapper');

    wrapper.style.background = '';
    if (state.inSleeperMode) {
      const slide = state.currentSleeperQueue[state.currentSleeperIndex];
      if (slide) {
        fillSlideContent(content, slide, { sleeperTag: 'Sleeper' });
        wrapper.style.background = slide.bgColor || '';
      }
      counter.textContent = `SLEEPER ${state.currentSleeperIndex + 1} / ${state.currentSleeperQueue.length}`;
      counter.style.color = 'var(--sleeper)';
      indicator.classList.add('visible');
      returnBtn.classList.add('visible');
    } else {
      const slide = state.mainSlides[state.currentMainIndex];
      if (slide) {
        fillSlideContent(content, slide);
        wrapper.style.background = slide.bgColor || '';
      }
      counter.textContent = `${state.currentMainIndex + 1} / ${state.mainSlides.length}`;
      counter.style.color = '';
      indicator.classList.remove('visible');
      returnBtn.classList.remove('visible');
    }

    renderFsElements();
    updateModeIndicator();
  }

  function renderFullscreenWithTransition() {
    const wrapper = $('fsCanvasWrapper');
    wrapper.classList.remove('fs-transition');
    void wrapper.offsetWidth;
    renderFullscreen();
    const slide = currentSlide();
    if (slide?.transition === 'fade') {
      wrapper.classList.add('fs-transition');
    }
  }

  function returnToMainFs() {
    returnToMain();
  }

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    // Topbar
    $('addSlideBtn').addEventListener('click', () => openAddSlide(false));
    $('addSleeperBtn').addEventListener('click', () => openAddSlide(true));
    $('presentBtn').addEventListener('click', startPresentation);
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('exportPdfBtn').addEventListener('click', exportPdf);

    // Element toolbar
    $('gridToggleBtn').addEventListener('click', toggleGrid);
    $('addTextBtn').addEventListener('click', addTextElement);
    $('addRectBtn').addEventListener('click', addRectElement);
    $('addCircleBtn').addEventListener('click', addCircleElement);
    $('addImageBtn').addEventListener('click', addImageElement);
    $('addVideoBtn').addEventListener('click', openVideoModal);

    // File inputs
    $('imageFileInput').addEventListener('change', onImageFileSelected);
    $('videoFileInput').addEventListener('change', onVideoFileSelected);

    // Video modal
    $('videoCancelBtn').addEventListener('click', closeVideoModal);
    $('videoAddUrlBtn').addEventListener('click', addVideoFromUrl);
    $('videoFileBtn').addEventListener('click', () => $('videoFileInput').click());
    $('videoUrlField').addEventListener('keydown', e => { if (e.key === 'Enter') addVideoFromUrl(); });

    // Bottom bar
    $('prevBtn').addEventListener('click', prevSlide);
    $('nextBtn').addEventListener('click', nextSlide);
    $('returnBtn').addEventListener('click', returnToMain);
    $('notesToggleBtn').addEventListener('click', () => {
      const panel = $('notesPanel');
      const visible = panel.style.display !== 'none';
      panel.style.display = visible ? 'none' : 'block';
    });

    // Notes
    $('notesTextarea').addEventListener('input', onNotesChange);

    // Canvas click
    $('slideCanvas').addEventListener('click', onCanvasClick);

    // Global drag
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);

    // Sidebar event delegation
    function delegateSidebar(e) {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      switch (action.dataset.action) {
        case 'goto-main': goToSlide(parseInt(action.dataset.index, 10)); break;
        case 'preview-sleeper': previewSleeper(parseInt(action.dataset.index, 10)); break;
        case 'add-main': openAddSlide(false); break;
        case 'add-sleeper': openAddSlide(true); break;
      }
    }
    $('mainSlideList').addEventListener('click', delegateSidebar);
    $('sleeperSlideList').addEventListener('click', delegateSidebar);

    // Add slide modal
    $('modalCancelBtn').addEventListener('click', closeModal);
    $('modalAddBtn').addEventListener('click', addSlide);
    $('sleeperToggle').addEventListener('click', toggleSleeperToggle);

    // Fullscreen
    $('fsReturnBtn').addEventListener('click', returnToMainFs);
    $('fsCodeInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const success = handleCode(e.target.value);
        if (success) { e.target.value = ''; e.target.blur(); }
      }
      if (e.key === 'Escape') { e.target.blur(); e.target.value = ''; }
    });

    // Code input (edit mode)
    $('codeInput').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const success = handleCode(e.target.value);
      e.target.classList.add(success ? 'flash-success' : 'flash-fail');
      setTimeout(() => e.target.classList.remove('flash-success', 'flash-fail'), 600);
      if (success) e.target.value = '';
    });

    // Global keyboard
    document.addEventListener('keydown', e => {
      const tag = e.target.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      // Undo/redo always available
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

      if (isEditable) {
        if (e.key === 'Escape' && state.isPresenting) e.target.blur();
        return;
      }

      // Copy / Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') { copyElement(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { pasteElement(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicateElement(); return; }

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElementId && !state.isPresenting) {
        e.preventDefault(); deleteSelectedElement(); return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
      else if (e.key === '/') {
        e.preventDefault();
        $(state.isPresenting ? 'fsCodeInput' : 'codeInput').focus();
      } else if (e.key === 'g' && !state.isPresenting) {
        toggleGrid();
      } else if (e.key === 'Escape') {
        if (state.isPresenting) {
          if (state.inSleeperMode) returnToMainFs();
          else exitPresentation();
        } else if (state.inSleeperMode) {
          returnToMain();
        } else if (state.selectedElementId) {
          clearElementSelection();
          renderElements();
          renderFormatBar();
        }
      }
    });

    initHistory();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
