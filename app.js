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
    } catch (err) {
      console.warn('Failed to load slides from storage:', err);
    }
    const seed = window.INITIAL_SLIDES || { main: [], sleeper: [] };
    return { main: [...seed.main], sleeper: [...seed.sleeper] };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        main: state.mainSlides,
        sleeper: state.sleeperSlides,
      }));
    } catch (err) {
      console.warn('Failed to persist slides:', err);
    }
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
  };

  // ── DOM HELPERS ──────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

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

  function currentSlide() {
    if (state.inSleeperMode) return state.currentSleeperQueue[state.currentSleeperIndex] || null;
    return state.mainSlides[state.currentMainIndex] || null;
  }

  function ensureElements(slide) {
    if (!slide.elements) slide.elements = [];
    return slide.elements;
  }

  function snapVal(v) {
    const clamped = Math.max(0, Math.min(100, v));
    if (!state.gridEnabled) return clamped;
    return Math.round(clamped / state.gridSize) * state.gridSize;
  }

  function clearElementSelection() {
    state.selectedElementId = null;
  }

  // ── GRID ─────────────────────────────────────────────────────────────
  function toggleGrid() {
    state.gridEnabled = !state.gridEnabled;
    $('slideCanvas').classList.toggle('grid-on', state.gridEnabled);
    $('gridToggleBtn').classList.toggle('active', state.gridEnabled);
  }

  // ── ELEMENT: ADD ─────────────────────────────────────────────────────
  function addTextElement() {
    const slide = currentSlide();
    if (!slide) { showToast('Add a slide first'); return; }
    const el = { id: uid(), type: 'text', x: 20, y: 30, w: 60, h: 20, content: 'Text' };
    ensureElements(slide).push(el);
    state.selectedElementId = el.id;
    persist();
    renderElements();
    showToast('Text box added — double-click to edit');
  }

  function addImageElement() {
    const slide = currentSlide();
    if (!slide) { showToast('Add a slide first'); return; }
    $('imageFileInput').click();
  }

  function openVideoModal() {
    const slide = currentSlide();
    if (!slide) { showToast('Add a slide first'); return; }
    $('videoUrlField').value = '';
    $('videoModal').classList.add('visible');
    $('videoUrlField').focus();
  }

  function closeVideoModal() {
    $('videoModal').classList.remove('visible');
  }

  function addVideoFromUrl() {
    const url = $('videoUrlField').value.trim();
    if (!url) return;
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const slide = currentSlide();
    if (!slide) return;
    const el = { id: uid(), type: 'video', x: 10, y: 10, w: 60, h: 45, src: embedUrl, srcType: 'url' };
    ensureElements(slide).push(el);
    state.selectedElementId = el.id;
    persist();
    renderElements();
    closeVideoModal();
    showToast('Video embedded');
  }

  // ── ELEMENT: FILE IMPORTS ────────────────────────────────────────────
  function onImageFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const slide = currentSlide();
      if (!slide) return;
      const el = { id: uid(), type: 'image', x: 10, y: 10, w: 50, h: 40, src: ev.target.result };
      ensureElements(slide).push(el);
      state.selectedElementId = el.id;
      persist();
      renderElements();
      showToast('Image added');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function onVideoFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const slide = currentSlide();
    if (!slide) return;
    const el = { id: uid(), type: 'video', x: 10, y: 10, w: 60, h: 45, src, srcType: 'file' };
    ensureElements(slide).push(el);
    state.selectedElementId = el.id;
    persist();
    renderElements();
    closeVideoModal();
    showToast('Video added');
    e.target.value = '';
  }

  // ── ELEMENT: DELETE ──────────────────────────────────────────────────
  function deleteSelectedElement() {
    if (!state.selectedElementId) return;
    const slide = currentSlide();
    if (!slide || !slide.elements) return;
    slide.elements = slide.elements.filter(el => el.id !== state.selectedElementId);
    state.selectedElementId = null;
    persist();
    renderElements();
    showToast('Element deleted');
  }

  // ── ELEMENT: DRAG & RESIZE ───────────────────────────────────────────
  let dragState = null;

  function onElementMouseDown(e) {
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.classList.contains('element-text') && state.selectedElementId === e.currentTarget.dataset.id) return;
    e.preventDefault();
    e.stopPropagation();
    const wrapper = e.currentTarget;
    const id = wrapper.dataset.id;
    state.selectedElementId = id;
    renderElements();
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
    e.preventDefault();
    e.stopPropagation();
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

  function onDocMouseMove(e) {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startMouseX) / dragState.canvasW * 100;
    const dy = (e.clientY - dragState.startMouseY) / dragState.canvasH * 100;
    const el = dragState.elData;

    if (dragState.type === 'move') {
      el.x = snapVal(dragState.startElX + dx);
      el.y = snapVal(dragState.startElY + dy);
    } else if (dragState.type === 'resize') {
      const h = dragState.handle;
      if (h.includes('e')) el.w = Math.max(5, snapVal(dragState.startElW + dx));
      if (h.includes('s')) el.h = Math.max(5, snapVal(dragState.startElH + dy));
      if (h.includes('w')) {
        const newX = snapVal(dragState.startElX + dx);
        const newW = dragState.startElW - (newX - dragState.startElX);
        if (newW >= 5) { el.w = newW; el.x = newX; }
      }
      if (h.includes('n')) {
        const newY = snapVal(dragState.startElY + dy);
        const newH = dragState.startElH - (newY - dragState.startElY);
        if (newH >= 5) { el.h = newH; el.y = newY; }
      }
    }

    const wrapper = $('slideCanvas').querySelector(`[data-id="${el.id}"]`);
    if (wrapper) {
      wrapper.style.left = el.x + '%';
      wrapper.style.top = el.y + '%';
      wrapper.style.width = el.w + '%';
      wrapper.style.height = el.h + '%';
    }
  }

  function onDocMouseUp() {
    if (!dragState) return;
    persist();
    dragState = null;
  }

  function onCanvasClick(e) {
    if (e.target === $('slideCanvas') || e.target === $('slideContent') || e.target.tagName === 'H1' || e.target.tagName === 'P') {
      if (state.selectedElementId) {
        state.selectedElementId = null;
        renderElements();
      }
    }
  }

  // ── ELEMENT: RENDER (EDIT MODE) ───────────────────────────────────────
  function renderElements() {
    const canvas = $('slideCanvas');
    if (!canvas) return;
    canvas.querySelectorAll('.slide-element').forEach(el => el.remove());
    const slide = currentSlide();
    if (!slide || !slide.elements) return;
    slide.elements.forEach(elData => buildElementDOM(canvas, elData, false));
  }

  // ── ELEMENT: RENDER (FULLSCREEN) ─────────────────────────────────────
  function renderFsElements() {
    const wrapper = $('fsCanvasWrapper');
    if (!wrapper) return;
    wrapper.querySelectorAll('.slide-element').forEach(el => el.remove());
    const slide = currentSlide();
    if (!slide || !slide.elements) return;
    slide.elements.forEach(elData => buildElementDOM(wrapper, elData, true));
  }

  // ── ELEMENT: BUILD DOM ───────────────────────────────────────────────
  function buildElementDOM(container, elData, readonly) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slide-element';
    wrapper.dataset.id = elData.id;
    if (!readonly && state.selectedElementId === elData.id) wrapper.classList.add('selected');
    wrapper.style.left = elData.x + '%';
    wrapper.style.top = elData.y + '%';
    wrapper.style.width = elData.w + '%';
    wrapper.style.height = elData.h + '%';

    if (elData.type === 'text') {
      const div = document.createElement('div');
      div.className = 'element-text';
      div.contentEditable = readonly ? 'false' : 'true';
      div.textContent = elData.content || '';
      if (!readonly) {
        div.addEventListener('blur', () => { elData.content = div.textContent; persist(); });
        div.addEventListener('mousedown', e => e.stopPropagation());
        div.addEventListener('dblclick', e => { e.stopPropagation(); div.focus(); });
      }
      wrapper.appendChild(div);
    } else if (elData.type === 'image') {
      const img = document.createElement('img');
      img.src = elData.src;
      img.alt = '';
      img.draggable = false;
      img.style.objectFit = 'contain';
      wrapper.appendChild(img);
    } else if (elData.type === 'video') {
      if (elData.srcType === 'url') {
        const iframe = document.createElement('iframe');
        iframe.src = elData.src;
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; encrypted-media; fullscreen';
        iframe.allowFullscreen = true;
        wrapper.appendChild(iframe);
      } else {
        const video = document.createElement('video');
        video.src = elData.src;
        video.controls = !readonly;
        video.style.objectFit = 'contain';
        if (!readonly) video.addEventListener('click', e => e.stopPropagation());
        wrapper.appendChild(video);
      }
    }

    if (!readonly) {
      wrapper.addEventListener('mousedown', onElementMouseDown);
      if (state.selectedElementId === elData.id) {
        ['nw', 'ne', 'se', 'sw'].forEach(dir => {
          const handle = document.createElement('div');
          handle.className = `resize-handle resize-${dir}`;
          handle.dataset.handle = dir;
          handle.addEventListener('mousedown', onResizeMouseDown);
          wrapper.appendChild(handle);
        });
      }
    }

    container.appendChild(wrapper);
  }

  // ── RENDER ───────────────────────────────────────────────────────────
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

    state.mainSlides.forEach((_slide, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb';
      if (!state.inSleeperMode && i === state.currentMainIndex) thumb.classList.add('active');
      thumb.dataset.index = String(i);
      thumb.dataset.action = 'goto-main';
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(i + 1);
      thumb.appendChild(num);
      mainList.appendChild(thumb);
    });
    mainList.appendChild(makeAddBtn(false));

    state.sleeperSlides.forEach((slide, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb sleeper-slide';
      if (state.inSleeperMode && i === state.currentSleeperIndex) thumb.classList.add('active');
      thumb.dataset.index = String(i);
      thumb.dataset.action = 'preview-sleeper';
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = `S${i + 1}`;
      thumb.appendChild(num);
      const badge = document.createElement('span');
      badge.className = 'code-badge';
      badge.textContent = slide.code;
      thumb.appendChild(badge);
      sleeperList.appendChild(thumb);
    });
    sleeperList.appendChild(makeAddBtn(true));
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
    renderElements();
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
      if (state.inSleeperMode) {
        el.textContent = 'SLEEPER';
        el.className = 'mode-indicator sleeper-active';
      } else {
        el.textContent = 'PRESENTING';
        el.className = 'mode-indicator presenting';
      }
    } else {
      el.textContent = 'EDIT';
      el.className = 'mode-indicator';
    }
  }

  // ── NAVIGATION ───────────────────────────────────────────────────────
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
    if (state.inSleeperMode) {
      if (state.currentSleeperIndex < state.currentSleeperQueue.length - 1) state.currentSleeperIndex++;
      else { returnToMain(); return; }
    } else {
      if (state.currentMainIndex < state.mainSlides.length - 1) {
        clearElementSelection();
        state.currentMainIndex++;
      }
    }
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
    render();
  }

  function returnToMain() {
    clearElementSelection();
    state.inSleeperMode = false;
    state.currentMainIndex = state.savedMainIndex;
    state.currentSleeperQueue = [];
    state.currentSleeperIndex = 0;
    showToast('Returned to main deck');
    render();
  }

  // ── CODE INPUT ───────────────────────────────────────────────────────
  function handleCode(code) {
    const upper = code.toUpperCase().trim();
    const matched = state.sleeperSlides.filter((s) => s.code === upper);
    if (matched.length > 0) {
      state.savedMainIndex = state.currentMainIndex;
      state.inSleeperMode = true;
      state.currentSleeperQueue = matched;
      state.currentSleeperIndex = 0;
      showToast(`Sleeper invoked: ${upper}`);
      render();
      return true;
    }
    return false;
  }

  // ── MODAL (ADD SLIDE) ─────────────────────────────────────────────────
  function openAddSlide(isSleeper) {
    state.modalIsSleeper = isSleeper;
    const toggle = $('sleeperToggle');
    const codeField = $('codeField');
    const title = $('modalTitle');

    toggle.classList.toggle('on', isSleeper);
    codeField.style.display = isSleeper ? 'block' : 'none';
    title.textContent = isSleeper ? 'Add Sleeper Slide' : 'Add Slide';

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

    if (state.modalIsSleeper) {
      const code = $('newSlideCode').value.trim().toUpperCase() || `SLP${state.sleeperSlides.length}`;
      state.sleeperSlides.push({ title, body, code, elements: [] });
      showToast(`Sleeper added with code: ${code}`);
    } else {
      state.mainSlides.push({ title, body, elements: [] });
      showToast('Slide added');
    }

    persist();
    closeModal();
    render();
  }

  function toggleSleeperToggle() {
    const toggle = $('sleeperToggle');
    toggle.classList.toggle('on');
    const on = toggle.classList.contains('on');
    state.modalIsSleeper = on;
    $('codeField').style.display = on ? 'block' : 'none';
  }

  // ── TOAST ────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ── FULLSCREEN PRESENTATION ──────────────────────────────────────────
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

    if (state.inSleeperMode) {
      const slide = state.currentSleeperQueue[state.currentSleeperIndex];
      if (slide) fillSlideContent(content, slide, { sleeperTag: 'Sleeper' });
      counter.textContent = `SLEEPER ${state.currentSleeperIndex + 1} / ${state.currentSleeperQueue.length}`;
      counter.style.color = 'var(--sleeper)';
      indicator.classList.add('visible');
      returnBtn.classList.add('visible');
    } else {
      const slide = state.mainSlides[state.currentMainIndex];
      if (slide) fillSlideContent(content, slide);
      counter.textContent = `${state.currentMainIndex + 1} / ${state.mainSlides.length}`;
      counter.style.color = '';
      indicator.classList.remove('visible');
      returnBtn.classList.remove('visible');
    }

    renderFsElements();
  }

  function returnToMainFs() {
    returnToMain();
    renderFullscreen();
  }

  // ── EVENT WIRING ─────────────────────────────────────────────────────
  function init() {
    // Topbar buttons
    $('addSlideBtn').addEventListener('click', () => openAddSlide(false));
    $('addSleeperBtn').addEventListener('click', () => openAddSlide(true));
    $('presentBtn').addEventListener('click', startPresentation);

    // Element toolbar
    $('gridToggleBtn').addEventListener('click', toggleGrid);
    $('addTextBtn').addEventListener('click', addTextElement);
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

    // Canvas click to deselect elements
    $('slideCanvas').addEventListener('click', onCanvasClick);

    // Global drag handlers
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);

    // Code input (edit mode)
    $('codeInput').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const success = handleCode(e.target.value);
      e.target.classList.add(success ? 'flash-success' : 'flash-fail');
      setTimeout(() => e.target.classList.remove('flash-success', 'flash-fail'), 600);
      if (success) e.target.value = '';
    });

    // Sidebar lists — event delegation
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
    $('fsCodeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const success = handleCode(e.target.value);
        if (success) {
          e.target.value = '';
          e.target.blur();
          renderFullscreen();
        }
      }
      if (e.key === 'Escape') {
        e.target.blur();
        e.target.value = '';
      }
    });

    // Global keyboard
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      if (isEditable) {
        if (e.key === 'Escape' && state.isPresenting) {
          e.target.blur();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementId && !state.isPresenting) {
          e.preventDefault();
          deleteSelectedElement();
          return;
        }
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
        }
      }
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
