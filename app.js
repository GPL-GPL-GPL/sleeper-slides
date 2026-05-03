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

    $('returnBtn').classList.toggle('visible', state.inSleeperMode);
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
    state.currentMainIndex = i;
    render();
  }

  function previewSleeper(i) {
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
      if (state.currentMainIndex < state.mainSlides.length - 1) state.currentMainIndex++;
    }
    render();
  }

  function prevSlide() {
    if (state.inSleeperMode) {
      if (state.currentSleeperIndex > 0) state.currentSleeperIndex--;
    } else {
      if (state.currentMainIndex > 0) state.currentMainIndex--;
    }
    render();
  }

  function returnToMain() {
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

  // ── MODAL ────────────────────────────────────────────────────────────
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
      state.sleeperSlides.push({ title, body, code });
      showToast(`Sleeper added with code: ${code}`);
    } else {
      state.mainSlides.push({ title, body });
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

    // Bottom bar
    $('prevBtn').addEventListener('click', prevSlide);
    $('nextBtn').addEventListener('click', nextSlide);
    $('returnBtn').addEventListener('click', returnToMain);

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

    // Modal
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
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape' && state.isPresenting) {
          e.target.blur();
          e.target.value = '';
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
      else if (e.key === '/') {
        e.preventDefault();
        $(state.isPresenting ? 'fsCodeInput' : 'codeInput').focus();
      } else if (e.key === 'Escape') {
        if (state.isPresenting) {
          if (state.inSleeperMode) returnToMainFs();
          else exitPresentation();
        } else if (state.inSleeperMode) {
          returnToMain();
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
