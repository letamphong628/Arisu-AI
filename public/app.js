(() => {
  const terminalWindow = document.getElementById('terminalWindow');
  const terminalOutput = document.getElementById('terminalOutput');
  const terminalForm = document.getElementById('terminalForm');
  const terminalInput = document.getElementById('terminalInput');
  const engineDot = document.getElementById('engineDot');
  const engineStatusText = document.getElementById('engineStatusText');
  const memoryBadge = document.getElementById('memoryBadge');
  const netBadge = document.getElementById('netBadge');
  const speedBadge = document.getElementById('speedBadge');

  const settingsDrawer = document.getElementById('settingsDrawer');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const btnDoneSettings = document.getElementById('btnDoneSettings');
  const btnResetSettings = document.getElementById('btnResetSettings');

  // Controls trong Settings
  const selPersonaMode = document.getElementById('selPersonaMode');
  const selLive2dModel = document.getElementById('selLive2dModel');
  const chkVoiceEnabled = document.getElementById('chkVoiceEnabled');
  const chkLiveAvatar = document.getElementById('chkLiveAvatar');

  const chkSaveMemory = document.getElementById('chkSaveMemory');
  const rngContextDepth = document.getElementById('rngContextDepth');
  const lblContextDepth = document.getElementById('lblContextDepth');
  const memoryPresets = document.getElementById('memoryPresets');
  const chkInternetSearch = document.getElementById('chkInternetSearch');
  const selSpeedMode = document.getElementById('selSpeedMode');
  const btnExportMemory = document.getElementById('btnExportMemory');
  const btnClearMemory = document.getElementById('btnClearMemory');

  const selFontFamily = document.getElementById('selFontFamily');
  const rngFontSize = document.getElementById('rngFontSize');
  const lblFontSize = document.getElementById('lblFontSize');
  const fontSizePresets = document.getElementById('fontSizePresets');

  const themePresets = document.getElementById('themePresets');
  const clrAccent = document.getElementById('clrAccent');
  const clrText = document.getElementById('clrText');
  const clrArisu = document.getElementById('clrArisu');
  const clrBg = document.getElementById('clrBg');

  const screenSizePresets = document.getElementById('screenSizePresets');
  const rngScreenWidth = document.getElementById('rngScreenWidth');
  const lblScreenWidth = document.getElementById('lblScreenWidth');
  const rngScreenHeight = document.getElementById('rngScreenHeight');
  const lblScreenHeight = document.getElementById('lblScreenHeight');
  const rngCornerRadius = document.getElementById('rngCornerRadius');
  const lblCornerRadius = document.getElementById('lblCornerRadius');

  const txtSystemPrompt = document.getElementById('txtSystemPrompt');
  const btnSaveSystemPrompt = document.getElementById('btnSaveSystemPrompt');
  const btnReloadSystemPrompt = document.getElementById('btnReloadSystemPrompt');

  // Nút nhanh trên TitleBar & MenuBar
  const btnToggleMode = document.getElementById('btnToggleMode');
  const btnToggleVoice = document.getElementById('btnToggleVoice');
  const btnQuickHelp = document.getElementById('btnQuickHelp');
  const btnQuickSettings = document.getElementById('btnQuickSettings');
  const btnQuickExit = document.getElementById('btnQuickExit');
  const btnToggleCompact = document.getElementById('btnToggleCompact');
  const btnToggleFullscreen = document.getElementById('btnToggleFullscreen');

  const menuHelp = document.getElementById('menuHelp');
  const menuAgentDemo = document.getElementById('menuAgentDemo');
  const menuSettings = document.getElementById('menuSettings');
  const menuStatus = document.getElementById('menuStatus');
  const menuClear = document.getElementById('menuClear');

  // Khung Live2D Spine 4.2 tương tác & Đính kèm File
  const liveArisuWidget = document.getElementById('liveArisuWidget');
  const live2dDragHandle = document.getElementById('live2dDragHandle');
  const arisuLive2dCanvas = document.getElementById('arisuLive2dCanvas');
  const l2dLoadingOverlay = document.getElementById('l2dLoadingOverlay');
  const arisuBubble = document.getElementById('arisuBubble');
  const heartParticles = document.getElementById('heartParticles');
  const arisuAffection = document.getElementById('arisuAffection');
  const btnL2dModelLobby = document.getElementById('btnL2dModelLobby');
  const btnL2dModelSprite = document.getElementById('btnL2dModelSprite');
  const btnL2dSizeToggle = document.getElementById('btnL2dSizeToggle');
  const btnL2dHide = document.getElementById('btnL2dHide');
  const btnL2dTalk = document.getElementById('btnL2dTalk');
  const l2dExprBar = document.getElementById('l2dExprBar');

  const btnAttachFile = document.getElementById('btnAttachFile');
  const fileUploadInput = document.getElementById('fileUploadInput');

  const THEMES = {
    'kali-blue': {
      accent: '#3b82f6',
      secondary: '#ff3e6c',
      arisu: '#38bdf8',
      text: '#e2e8f0',
      bg: '#0b0f17'
    },
    'arisu-cyan': {
      accent: '#00d2ff',
      secondary: '#38bdf8',
      arisu: '#67e8f9',
      text: '#ecfeff',
      bg: '#07131d'
    },
    'matrix-green': {
      accent: '#10b981',
      secondary: '#00ff66',
      arisu: '#34d399',
      text: '#d1fae5',
      bg: '#06120c'
    },
    'kali-red': {
      accent: '#f43f5e',
      secondary: '#a855f7',
      arisu: '#fb7185',
      text: '#ffe4e6',
      bg: '#130912'
    },
    'retro-amber': {
      accent: '#f59e0b',
      secondary: '#ea580c',
      arisu: '#fbbf24',
      text: '#fef3c7',
      bg: '#140f06'
    }
  };

  const DEFAULT_SETTINGS = {
    personaMode: 'agent',
    live2dModel: 'lobby',
    live2dExpanded: false,
    voiceEnabled: true,
    liveAvatar: true,
    saveMemory: true,
    contextDepth: 52,
    internetSearch: true,
    speedMode: 'turbo',
    fontFamily: "'Cascadia Mono', 'Consolas', 'Courier New', monospace",
    fontSize: 15,
    theme: 'kali-blue',
    accentColor: '#3b82f6',
    secondaryColor: '#ff3e6c',
    arisuColor: '#38bdf8',
    textColor: '#e2e8f0',
    bgColor: '#0b0f17',
    screenWidth: 92,
    screenHeight: 92,
    cornerRadius: 18
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let chatHistory = [];
  let commandHistory = [];
  let commandIndex = -1;
  let isGenerating = false;
  let headpatCount = 100;
  let audioCtx = null;
  let bubbleTimer = null;

  let serverStatus = {
    llamaReady: true,
    internetOnline: true,
    osPlatform: 'Multi-OS',
    modelFile: 'gemma-2-2b-it-Q4_K_M.gguf',
    llamaStatusMessage: 'ARISU AGENT v4.0 • Sẵn sàng',
    character: {
      name: 'Tendou Arisu',
      user_title: 'Sensei',
      greeting:
        'Panpakapan~! Hệ thống Terminal AI Agent v4.0 đã khởi động! Chào mừng Sensei đăng nhập vào căn cứ Câu lạc bộ Phát triển Game! Arisu đã sẵn sàng trò chuyện, tìm & mở tài liệu, ghi chú Obsidian và hỗ trợ Sensei!'
    }
  };

  // ============================================================================
  // ÂM THANH RETRO JRPG 8-BIT (100% OFFLINE)
  // ============================================================================
  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playPanpakapanFanfare() {
    if (!currentSettings.voiceEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.085);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.085);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.085 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.085);
        osc.stop(ctx.currentTime + idx * 0.085 + 0.23);
      });
    } catch (e) {}
  }

  let lastBlipTime = 0;
  function playTypingBlip() {
    if (!currentSettings.voiceEnabled) return;
    const now = performance.now();
    if (now - lastBlipTime < 65) return;
    lastBlipTime = now;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680 + Math.random() * 160, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.032);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.036);
    } catch (e) {}
  }

  function showArisuBubble(text, durationMs = 3400) {
    if (!arisuBubble || !text) return;
    arisuBubble.textContent = text;
    arisuBubble.classList.add('show');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      arisuBubble.classList.remove('show');
    }, durationMs);
  }

  function spawnParticle() {
    if (!heartParticles) return;
    const p = document.createElement('span');
    p.className = 'floating-heart';
    p.textContent = Math.random() > 0.4 ? '♥' : '✦';
    p.style.left = `${20 + Math.random() * 60}%`;
    p.style.top = `${16 + Math.random() * 28}%`;
    heartParticles.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }

  function getTimeStr() {
    const d = new Date();
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatArisuMessageHtml(rawText) {
    let safe = escapeHtml(rawText);
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#f8fafc">$1</strong>');
    safe = safe.replace(
      /`([^`]+)`/g,
      '<code style="background:rgba(56,189,248,0.12);padding:1px 6px;border-radius:5px;color:#7dd3fc">$1</code>'
    );
    safe = safe.replace(/\[AGENT_FILE:([^|\]]+)\|([^\]]+)\]/g, (_, filePath, label) => {
      return `<button type="button" class="agent-file-btn" data-open-path="${filePath}">${label}</button>`;
    });
    return safe;
  }

  function bindAgentButtons(container) {
    container.querySelectorAll('.agent-file-btn[data-open-path]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        const targetPath = btn.getAttribute('data-open-path');
        playPanpakapanFanfare();
        await fetch('/api/open-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: targetPath })
        }).catch(() => {});
      });
    });
  }

  function scrollToBottom() {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  function isUnlimitedDepth(val) {
    return val === 'unlimited' || Number(val) >= 52;
  }

  function applySettingsToDOM(s, persist = true) {
    const root = document.documentElement;
    root.style.setProperty('--term-font', s.fontFamily);
    root.style.setProperty('--term-font-size', `${s.fontSize}px`);
    root.style.setProperty('--accent-color', s.accentColor);
    root.style.setProperty('--accent-secondary', s.secondaryColor || '#ff3e6c');
    root.style.setProperty('--arisu-color', s.arisuColor);
    root.style.setProperty('--text-color', s.textColor);
    root.style.setProperty('--term-bg', s.bgColor);
    root.style.setProperty('--term-width', `${s.screenWidth}%`);
    root.style.setProperty('--term-height', `${s.screenHeight}%`);
    root.style.setProperty('--term-radius', `${s.cornerRadius}px`);

    if (selPersonaMode) selPersonaMode.value = s.personaMode || 'agent';
    if (selLive2dModel) selLive2dModel.value = s.live2dModel || 'lobby';
    if (chkVoiceEnabled) chkVoiceEnabled.checked = s.voiceEnabled !== false;
    if (chkLiveAvatar) chkLiveAvatar.checked = s.liveAvatar !== false;

    const l2dVisible = s.liveAvatar !== false;
    if (liveArisuWidget) {
      liveArisuWidget.classList.toggle('hidden', !l2dVisible);
      liveArisuWidget.classList.toggle('expanded', !!s.live2dExpanded);
    }

    const l2dModel = s.live2dModel || 'lobby';
    if (btnL2dModelLobby && btnL2dModelSprite) {
      btnL2dModelLobby.classList.toggle('active', l2dModel === 'lobby');
      btnL2dModelSprite.classList.toggle('active', l2dModel === 'sprite');
    }
    if (l2dExprBar) {
      l2dExprBar.style.display = l2dModel === 'sprite' ? 'flex' : 'none';
    }

    if (window.ArisuLive2D) {
      window.ArisuLive2D.setVisible(l2dVisible);
      window.ArisuLive2D.setExpanded(!!s.live2dExpanded);
      if (window.ArisuLive2D.activeKey !== l2dModel) {
        window.ArisuLive2D.setModel(l2dModel);
      }
    }

    chkSaveMemory.checked = !!s.saveMemory;

    const sliderVal = isUnlimitedDepth(s.contextDepth) ? 52 : Number(s.contextDepth || 52);
    rngContextDepth.value = sliderVal;
    lblContextDepth.textContent = sliderVal >= 52 ? 'Vô hạn (RAG)' : `${sliderVal} tin nhắn`;

    if (memoryPresets) {
      memoryPresets.querySelectorAll('.pill-btn').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.depth) === sliderVal);
      });
    }

    if (chkInternetSearch) chkInternetSearch.checked = s.internetSearch !== false;
    if (selSpeedMode) selSpeedMode.value = s.speedMode || 'turbo';

    selFontFamily.value = s.fontFamily;
    rngFontSize.value = s.fontSize;
    lblFontSize.textContent = `${s.fontSize}px`;

    clrAccent.value = s.accentColor;
    clrText.value = s.textColor;
    clrArisu.value = s.arisuColor;
    clrBg.value = s.bgColor;

    rngScreenWidth.value = s.screenWidth;
    lblScreenWidth.textContent = `${s.screenWidth}%`;
    rngScreenHeight.value = s.screenHeight;
    lblScreenHeight.textContent = `${s.screenHeight}%`;
    rngCornerRadius.value = s.cornerRadius;
    lblCornerRadius.textContent = `${s.cornerRadius}px`;

    updateBadges();

    if (persist) {
      try {
        localStorage.setItem('arisu_kali_settings', JSON.stringify(s));
      } catch (e) {}
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      }).catch(() => {});
    }
  }

  function getModelLabel(mode) {
    return mode === 'roleplay' ? 'Model: RP (RolePlay)' : 'Model: Agent';
  }

  function updateBadges() {
    if (!currentSettings.saveMemory) {
      memoryBadge.textContent = 'Bộ nhớ: Tắt';
    } else {
      const capStr = isUnlimitedDepth(currentSettings.contextDepth)
        ? 'Vô hạn'
        : `Tối đa ${currentSettings.contextDepth}`;
      memoryBadge.textContent = `Bộ nhớ: ${capStr} (${chatHistory.length} tin)`;
    }

    const modeLabel = getModelLabel(currentSettings.personaMode);
    if (btnToggleMode) {
      btnToggleMode.textContent = modeLabel;
    }

    if (btnToggleVoice) {
      btnToggleVoice.textContent = currentSettings.voiceEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT';
    }

    if (netBadge) {
      netBadge.textContent = serverStatus.internetOnline ? `${modeLabel} • Online` : `${modeLabel} • Offline`;
    }

    if (speedBadge) {
      speedBadge.textContent = currentSettings.speedMode === 'gguf' ? 'Lõi: GGUF' : 'Turbo';
    }
  }

  function initInteractiveLive2D() {
    if (!window.ArisuLive2D || !arisuLive2dCanvas) return;

    window.ArisuLive2D.init(arisuLive2dCanvas, {
      initialModel: currentSettings.live2dModel || 'lobby',
      loadingOverlay: l2dLoadingOverlay,
      isVoiceEnabled: () => currentSettings.voiceEnabled !== false,
      onBubble: (txt, ms) => showArisuBubble(txt, ms),
      onSpawnHeart: () => spawnParticle(),
      onAffectionGain: (delta) => {
        headpatCount += delta;
        if (arisuAffection) arisuAffection.textContent = `Tình cảm: ${headpatCount}%`;
        playPanpakapanFanfare();
      }
    });

    // Nút chuyển giữa Memorial Lobby và Standing Sprite
    if (btnL2dModelLobby) {
      btnL2dModelLobby.addEventListener('click', () => {
        currentSettings.live2dModel = 'lobby';
        applySettingsToDOM(currentSettings);
      });
    }
    if (btnL2dModelSprite) {
      btnL2dModelSprite.addEventListener('click', () => {
        currentSettings.live2dModel = 'sprite';
        applySettingsToDOM(currentSettings);
      });
    }

    // Nút phóng to / thu nhỏ khung Live2D
    if (btnL2dSizeToggle) {
      btnL2dSizeToggle.addEventListener('click', () => {
        currentSettings.live2dExpanded = !currentSettings.live2dExpanded;
        applySettingsToDOM(currentSettings);
      });
    }

    // Nút ẩn khung Live2D
    if (btnL2dHide) {
      btnL2dHide.addEventListener('click', () => {
        currentSettings.liveAvatar = false;
        applySettingsToDOM(currentSettings);
      });
    }

    // Nút Nói chuyện trực tiếp trên Live2D
    if (btnL2dTalk) {
      btnL2dTalk.addEventListener('click', () => {
        window.ArisuLive2D.triggerTalk();
      });
    }

    // Các nút đổi biểu cảm khi dùng Standing Sprite
    if (l2dExprBar) {
      l2dExprBar.querySelectorAll('.l2d-expr-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          l2dExprBar.querySelectorAll('.l2d-expr-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          window.ArisuLive2D.setExpression(btn.dataset.expr);
        });
      });
    }

    // Kéo thả khung Live2D bằng thanh header
    if (live2dDragHandle && liveArisuWidget && terminalWindow) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      live2dDragHandle.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        dragging = true;
        const wRect = liveArisuWidget.getBoundingClientRect();
        const pRect = terminalWindow.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = wRect.left - pRect.left;
        startTop = wRect.top - pRect.top;
        liveArisuWidget.style.right = 'auto';
        liveArisuWidget.style.bottom = 'auto';
        liveArisuWidget.style.left = `${startLeft}px`;
        liveArisuWidget.style.top = `${startTop}px`;
      });

      window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const pRect = terminalWindow.getBoundingClientRect();
        const wRect = liveArisuWidget.getBoundingClientRect();
        const nextLeft = Math.max(8, Math.min(pRect.width - wRect.width - 8, startLeft + (e.clientX - startX)));
        const nextTop = Math.max(46, Math.min(pRect.height - wRect.height - 64, startTop + (e.clientY - startY)));
        liveArisuWidget.style.left = `${nextLeft}px`;
        liveArisuWidget.style.top = `${nextTop}px`;
      });

      window.addEventListener('pointerup', () => {
        dragging = false;
      });
    }
  }

  function openSettings() {
    settingsDrawer.classList.add('open');
    settingsBackdrop.classList.add('open');
    settingsDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    settingsDrawer.classList.remove('open');
    settingsBackdrop.classList.remove('open');
    settingsDrawer.setAttribute('aria-hidden', 'true');
    terminalInput.focus();
  }

  function toggleSettings() {
    if (settingsDrawer.classList.contains('open')) {
      closeSettings();
    } else {
      openSettings();
    }
  }

  function renderBanner() {
    const banner = document.createElement('div');
    banner.className = 'kali-banner-box';
    banner.innerHTML = `
      <div class="banner-avatar-card">
        <img src="/Arisu.png" alt="Tendou Arisu" />
      </div>
      <div class="banner-info">
        <div class="banner-title">
          <span>㉿ KALI LINUX // TENDOU ARISU AI TERMINAL v4.0</span>
          <span class="window-subtitle-pill">Windows • Linux • macOS</span>
        </div>
        <div class="banner-meta">
          <span><b>Nhân vật:</b> Tendou Arisu (AL-1S • CLB Phát triển Game)</span>
          <span><b>Chế độ:</b> Model: Agent &amp; Model: RP (RolePlay)</span>
          <span><b>Live2D:</b> Spine 4.2 Interactive (Mắt nhìn theo chuột, xoa đầu, thoại)</span>
          <span><b>Bộ nhớ RAG:</b> Lưu Vô Hạn + Lọc ngữ cảnh chống ảo giác</span>
        </div>
        <div class="banner-tip">
          <b>Lệnh nhanh:</b> <code data-cmd="Tìm giúp thầy file README.md">Tìm file README.md</code>,
          <code data-cmd="Tóm tắt tài liệu README.md vào Note">Tóm tắt tài liệu vào Note</code>,
          <code data-cmd="tools">tools</code>,
          <code data-cmd="settings">settings</code>,
          <code data-cmd="exit">exit</code>
        </div>
      </div>
    `;
    banner.querySelectorAll('code[data-cmd]').forEach((el) => {
      el.addEventListener('click', () => {
        handleUserSubmission(el.getAttribute('data-cmd'));
      });
    });
    terminalOutput.appendChild(banner);
  }

  function appendUserTerminalBlock(text) {
    const block = document.createElement('div');
    block.className = 'term-block';
    block.innerHTML = `
      <div class="kali-line-1">
        <span class="prompt-bracket">┌──(</span><span class="prompt-user">sensei㉿kali</span><span class="prompt-bracket">)-[</span><span class="prompt-path">~/arisu-ai</span><span class="prompt-bracket">]</span>
        <span class="prompt-time">${getTimeStr()}</span>
      </div>
      <div class="kali-line-2">
        <span class="prompt-arrow">└─<span class="prompt-dollar">$</span></span>
        <div class="user-msg-text">${escapeHtml(text)}</div>
      </div>
    `;
    terminalOutput.appendChild(block);
    scrollToBottom();
  }

  function createArisuTerminalBlock(initialText = '', isStreaming = false) {
    const block = document.createElement('div');
    block.className = 'term-block';
    block.innerHTML = `
      <div class="kali-line-1">
        <span class="prompt-bracket">┌──(</span>
        <span class="prompt-arisu">
          <img src="/Arisu.png" alt="Arisu" class="inline-arisu-icon" />
          arisu㉿millennium
        </span>
        <span class="prompt-bracket">)-[</span><span class="prompt-path">~/game-dev-dept</span><span class="prompt-bracket">]</span>
        <span class="prompt-time">${getTimeStr()}</span>
      </div>
      <div class="kali-line-2">
        <span class="prompt-arrow">└─<span class="prompt-bolt">&gt;</span></span>
        <div class="arisu-msg-text ${isStreaming ? 'typing-cursor' : ''}">${formatArisuMessageHtml(initialText)}</div>
      </div>
    `;
    terminalOutput.appendChild(block);
    bindAgentButtons(block);
    scrollToBottom();
    return block.querySelector('.arisu-msg-text');
  }

  function appendSystemBox(htmlContent) {
    const box = document.createElement('div');
    box.className = 'term-block';
    box.innerHTML = `<div class="sys-output-box">${htmlContent}</div>`;
    terminalOutput.appendChild(box);
    bindAgentButtons(box);
    scrollToBottom();
  }

  function showHelpCommand() {
    appendSystemBox(`
      <div style="font-weight:700; color:var(--arisu-color); margin-bottom:6px;">
        DANH SÁCH LỆNH TERMINAL CỦA TENDOU ARISU v4.0:
      </div>
      <table class="sys-table">
        <tr>
          <td>help</td>
          <td>Hiển thị danh sách toàn bộ lệnh và tính năng trong Terminal</td>
        </tr>
        <tr>
          <td>tools / agent</td>
          <td>Xem các kỹ năng <b>Model: Agent</b> (Tìm &amp; mở file, đọc tài liệu, tạo Note Obsidian, kiểm tra RAM/CPU)</td>
        </tr>
        <tr>
          <td>mode</td>
          <td>Chuyển đổi nhanh giữa <b>Model: Agent</b> và <b>Model: RP (RolePlay)</b></td>
        </tr>
        <tr>
          <td>settings</td>
          <td>Mở bảng <b>Cài đặt</b> sổ ra bên phải (Chế độ Model, Live2D, Bộ nhớ, Font, Màu, Cỡ chữ, Màn hình)</td>
        </tr>
        <tr>
          <td>find &lt;tên file&gt;</td>
          <td>Tìm kiếm tài liệu/file trong máy tính (hoặc nhắn: <i>"Tìm giúp thầy file ..."</i>)</td>
        </tr>
        <tr>
          <td>open &lt;tên file&gt;</td>
          <td>Tìm và mở trực tiếp file đó lên màn hình</td>
        </tr>
        <tr>
          <td>note &lt;nội dung&gt;</td>
          <td>Tạo ghi chú chuẩn <b>Obsidian Markdown (.md)</b> vào thư mục <code>notes/</code></td>
        </tr>
        <tr>
          <td>status / neofetch</td>
          <td>Kiểm tra hệ điều hành, Model GGUF đang dùng, Bộ nhớ RAG và trạng thái hệ thống</td>
        </tr>
        <tr>
          <td>clear / cls</td>
          <td>Xóa gọn màn hình hiển thị Terminal hiện tại</td>
        </tr>
        <tr>
          <td>exit / quit</td>
          <td>Tắt mô hình AI, đóng trang Web và thoát hoàn toàn cửa sổ <code>.bat</code> / <code>.sh</code> đang chạy</td>
        </tr>
      </table>
    `);
  }

  function showToolsDemoCommand() {
    appendSystemBox(`
      <div style="font-weight:700; color:var(--arisu-color); margin-bottom:8px;">
        KỸ NĂNG MODEL: AGENT (Bấm vào lệnh mẫu để chạy thử):
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; font-size:0.92em;">
        <div><b>1. Tìm kiếm &amp; Mở tài liệu trong máy tính:</b>
          <code class="cmd-chip" data-try="Tìm giúp thầy file README.md" style="cursor:pointer;color:#38bdf8;margin-left:6px;">[Thử: Tìm giúp thầy file README.md]</code>
        </div>
        <div><b>2. Đọc tài liệu &amp; Tự động ghi chú vào Obsidian Note (.md):</b>
          <code class="cmd-chip" data-try="Tóm tắt tài liệu README.md vào Note giúp thầy" style="cursor:pointer;color:#38bdf8;margin-left:6px;">[Thử: Tóm tắt tài liệu README.md vào Note]</code>
        </div>
        <div><b>3. Ghi chú nhanh ý tưởng vào sổ tay Obsidian:</b>
          <code class="cmd-chip" data-try="Note lại giúp thầy: Nâng cấp Arisu AI hỗ trợ Linux .sh và Live2D tương tác" style="cursor:pointer;color:#38bdf8;margin-left:6px;">[Thử: Lưu Note ý tưởng mới]</code>
        </div>
        <div><b>4. Kiểm tra tài nguyên Phần cứng (RAM / CPU / OS):</b>
          <code class="cmd-chip" data-try="Kiểm tra RAM và cấu hình máy tính giúp thầy" style="cursor:pointer;color:#38bdf8;margin-left:6px;">[Thử: Kiểm tra RAM &amp; CPU máy tính]</code>
        </div>
      </div>
    `);
    terminalOutput.querySelectorAll('.cmd-chip[data-try]').forEach((el) => {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      el.addEventListener('click', () => {
        handleUserSubmission(el.getAttribute('data-try'));
      });
    });
  }

  async function showStatusCommand() {
    await refreshServerStatus();
    const capTxt = isUnlimitedDepth(currentSettings.contextDepth)
      ? 'Vô hạn (RAG Anti-Hallucination)'
      : `${currentSettings.contextDepth} tin nhắn`;
    appendSystemBox(`
      <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
        <img src="/Arisu.png" alt="Arisu" style="width:60px; height:60px; border-radius:12px; border:2px solid var(--arisu-color);" />
        <div style="flex:1; min-width:220px;">
          <div style="font-weight:800; color:var(--arisu-color); margin-bottom:4px;">
            arisu@kali-millennium — System Diagnostic (neofetch v4.0)
          </div>
          <div style="font-size:0.9em; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:4px 12px;">
            <span><b>Character:</b> Tendou Arisu (AL-1S • Lv.99 Hero)</span>
            <span><b>OS Platform:</b> ${escapeHtml(serverStatus.osPlatform || 'Cross-Platform')}</span>
            <span><b>Active Model:</b> ${escapeHtml(serverStatus.modelFile || 'gemma-2-2b-it-Q4_K_M.gguf')}</span>
            <span><b>Chế độ:</b> ${getModelLabel(currentSettings.personaMode)}</span>
            <span><b>Bộ nhớ RAG:</b> ${capTxt} (Đã lưu ${chatHistory.length} tin)</span>
            <span><b>Tình cảm:</b> ${headpatCount}%</span>
          </div>
        </div>
      </div>
    `);
  }

  async function executeExitCommand() {
    playPanpakapanFanfare();
    createArisuTerminalBlock(
      serverStatus.character?.farewell ||
        'Panpakapan~! Đã lưu toàn bộ tiến trình phiêu lưu vào điểm Save! Chúc Sensei nghỉ ngơi thật tốt để hồi phục 100% HP và MP nhé! Hẹn gặp lại Sensei~!',
      false
    );

    appendSystemBox(`
      <span style="color:#10b981; font-weight:700;">[SYSTEM SHUTDOWN]</span>
      Đang lưu bộ nhớ RAG, tắt tiến trình AI và đóng cửa sổ <code>.bat</code> / <code>.sh</code>...
    `);

    try {
      await fetch('/api/shutdown', { method: 'POST' });
    } catch (e) {}

    setTimeout(() => {
      window.open('', '_self', '');
      window.close();
      document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#05070c; color:#38bdf8; font-family:monospace; text-align:center; padding:24px;">
          <img src="/Arisu.png" style="width:84px; height:84px; border-radius:20px; border:2px solid #38bdf8; margin-bottom:16px;" onerror="this.style.display='none'" />
          <h2 style="margin-bottom:8px;">[HỆ THỐNG TENDOU ARISU AI ĐÃ TẮT HOÀN TOÀN]</h2>
          <p style="color:#94a3b8; max-width:460px; line-height:1.6;">
            Tiến trình AI và cửa sổ khởi chạy (<b>.bat / .sh</b>) đã được đóng thành công. Hẹn gặp lại Sensei~!
          </p>
        </div>
      `;
    }, 650);
  }

  async function handleUserSubmission(rawInput) {
    const text = String(rawInput || '').trim();
    if (!text || isGenerating) return;

    commandHistory.push(text);
    commandIndex = commandHistory.length;
    terminalInput.value = '';

    const cmd = text.toLowerCase();

    if (cmd === 'help' || cmd === '/help' || cmd === '?') {
      appendUserTerminalBlock(text);
      showHelpCommand();
      return;
    }

    if (cmd === 'tools' || cmd === 'agent' || cmd === '/tools') {
      appendUserTerminalBlock(text);
      showToolsDemoCommand();
      return;
    }

    if (cmd === 'mode' || cmd === '/mode') {
      appendUserTerminalBlock(text);
      currentSettings.personaMode = currentSettings.personaMode === 'roleplay' ? 'agent' : 'roleplay';
      applySettingsToDOM(currentSettings);
      playPanpakapanFanfare();
      appendSystemBox(`Đã chuyển sang <b>${getModelLabel(currentSettings.personaMode)}</b>.`);
      return;
    }

    if (cmd === 'settings' || cmd === '/settings' || cmd === 'config' || cmd === 'setting') {
      appendUserTerminalBlock(text);
      openSettings();
      appendSystemBox(`Đã mở bảng <b>Cài đặt hệ thống</b> bên phải màn hình.`);
      return;
    }

    if (cmd === 'clear' || cmd === 'cls' || cmd === '/clear') {
      terminalOutput.innerHTML = '';
      renderBanner();
      return;
    }

    if (cmd === 'status' || cmd === 'neofetch' || cmd === '/status') {
      appendUserTerminalBlock(text);
      await showStatusCommand();
      return;
    }

    if (cmd === 'memory' || cmd === '/memory') {
      appendUserTerminalBlock(text);
      const capStr = isUnlimitedDepth(currentSettings.contextDepth)
        ? 'Vô hạn (RAG Anti-Hallucination)'
        : `${currentSettings.contextDepth} tin nhắn`;
      appendSystemBox(`
        <b>Trạng thái bộ nhớ cuộc trò chuyện:</b> ${currentSettings.saveMemory ? '<b style="color:#10b981">BẬT</b>' : '<b style="color:#f43f5e">TẮT</b>'}
        • Chế độ: <b>${capStr}</b>
        • Tổng số tin nhắn đang lưu trong <code>chat_memory.json</code>: <b>${chatHistory.length}</b> tin nhắn.
      `);
      return;
    }

    if (cmd === 'memory clear' || cmd === 'forget' || cmd === 'reset') {
      appendUserTerminalBlock(text);
      await clearConversationMemory();
      return;
    }

    if (cmd === 'reload' || cmd === 'system' || cmd === '/reload') {
      appendUserTerminalBlock(text);
      await reloadSystemPromptFromDisk(true);
      return;
    }

    if (cmd === 'exit' || cmd === '/exit' || cmd === 'quit' || cmd === 'shutdown') {
      appendUserTerminalBlock(text);
      await executeExitCommand();
      return;
    }

    // Gửi tin nhắn tới Arisu AI Agent
    appendUserTerminalBlock(text);
    isGenerating = true;
    if (window.ArisuLive2D) window.ArisuLive2D.setChatTalking(true, 'normal');
    const arisuTextNode = createArisuTerminalBlock('', true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
          saveMemory: currentSettings.saveMemory,
          contextDepth: isUnlimitedDepth(currentSettings.contextDepth)
            ? 'unlimited'
            : currentSettings.contextDepth,
          internetSearch: currentSettings.internetSearch !== false,
          speedMode: currentSettings.speedMode || 'turbo',
          personaMode: currentSettings.personaMode || 'agent'
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let sseBuffer = '';
      let accumulated = '';
      let playedFanfare = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() || '';

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          try {
            const payload = JSON.parse(jsonStr);
            if (payload.token) {
              accumulated += payload.token;
              if (!playedFanfare && /panpakapan/i.test(accumulated)) {
                playedFanfare = true;
                playPanpakapanFanfare();
              } else {
                playTypingBlip();
              }
              arisuTextNode.innerHTML = formatArisuMessageHtml(accumulated);
              bindAgentButtons(arisuTextNode);
              scrollToBottom();
            }
            if (payload.done && payload.fullText) {
              accumulated = payload.fullText;
              arisuTextNode.innerHTML = formatArisuMessageHtml(accumulated);
              bindAgentButtons(arisuTextNode);
            }
          } catch (e) {}
        }
      }

      arisuTextNode.classList.remove('typing-cursor');

      if (currentSettings.saveMemory) {
        chatHistory.push(
          { role: 'user', content: text, timestamp: new Date().toISOString() },
          { role: 'assistant', content: accumulated, timestamp: new Date().toISOString() }
        );
        try {
          localStorage.setItem('arisu_chat_history', JSON.stringify(chatHistory));
        } catch (e) {}
        updateBadges();
      }
    } catch (err) {
      arisuTextNode.classList.remove('typing-cursor');
      arisuTextNode.textContent =
        'Á! Kết nối tới lõi năng lượng gặp gián đoạn nhỏ! Sensei thử gửi lại tin nhắn cho Arisu nhé!';
    } finally {
      isGenerating = false;
      if (window.ArisuLive2D) window.ArisuLive2D.setChatTalking(false);
      terminalInput.focus();
      scrollToBottom();
    }
  }

  async function handleFileAttachment(file) {
    if (!file) return;
    appendUserTerminalBlock(`[Đính kèm tệp: ${file.name} (${Math.round(file.size / 1024)} KB)]`);
    playPanpakapanFanfare();

    let textContent = '';
    const isText =
      file.type.startsWith('text/') ||
      /\.(txt|md|json|js|py|html|css|csv|xml|yml|yaml|bat|sh|log)$/i.test(file.name);

    if (isText && file.size < 2 * 1024 * 1024) {
      try {
        textContent = await file.text();
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/upload-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          textContent: textContent.slice(0, 15000)
        })
      });
      const data = await res.json();
      if (data.ok && data.reply) {
        createArisuTerminalBlock(data.reply, false);
      }
    } catch (e) {
      createArisuTerminalBlock(`Panpakapan~! Arisu đã nhận được tệp ${file.name} của Sensei!`, false);
    }
  }

  if (btnAttachFile && fileUploadInput) {
    btnAttachFile.addEventListener('click', () => fileUploadInput.click());
    fileUploadInput.addEventListener('change', () => {
      if (fileUploadInput.files && fileUploadInput.files[0]) {
        handleFileAttachment(fileUploadInput.files[0]);
        fileUploadInput.value = '';
      }
    });
  }

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileAttachment(e.dataTransfer.files[0]);
    }
  });

  async function clearConversationMemory() {
    chatHistory = [];
    try {
      localStorage.removeItem('arisu_chat_history');
    } catch (e) {}
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: [] })
    }).catch(() => {});
    updateBadges();
    appendSystemBox(`Đã xóa toàn bộ bộ nhớ cuộc trò chuyện của Arisu.`);
  }

  async function reloadSystemPromptFromDisk(showNotice = false) {
    try {
      const res = await fetch('/api/system-prompt');
      const data = await res.json();
      if (data.ok && data.config) {
        txtSystemPrompt.value = data.config.system_prompt || '';
        if (showNotice) {
          appendSystemBox(
            `Đã nạp lại file <code>system_prompt.json</code> thành công! Nhân vật: <b>${escapeHtml(
              data.config.character_name || 'Tendou Arisu'
            )}</b>.`
          );
        }
      }
    } catch (e) {}
  }

  async function refreshServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.ok) {
        serverStatus = data;
        const netTxt = data.internetOnline ? 'Online' : 'Offline';
        engineStatusText.textContent = `${data.llamaStatusMessage} • ${netTxt}`;
        engineDot.classList.add('online');
        updateBadges();
      }
    } catch (e) {
      engineDot.classList.remove('online');
      engineStatusText.textContent = 'Offline / Đã ngắt kết nối máy chủ';
    }
  }

  terminalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserSubmission(terminalInput.value);
  });

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0 && commandIndex > 0) {
        e.preventDefault();
        commandIndex--;
        terminalInput.value = commandHistory[commandIndex];
      }
    } else if (e.key === 'ArrowDown') {
      if (commandIndex < commandHistory.length - 1) {
        e.preventDefault();
        commandIndex++;
        terminalInput.value = commandHistory[commandIndex];
      } else {
        commandIndex = commandHistory.length;
        terminalInput.value = '';
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsDrawer.classList.contains('open')) {
      closeSettings();
    }
  });

  closeSettingsBtn.addEventListener('click', closeSettings);
  btnDoneSettings.addEventListener('click', closeSettings);
  settingsBackdrop.addEventListener('click', closeSettings);

  if (btnToggleMode) {
    btnToggleMode.addEventListener('click', () => handleUserSubmission('mode'));
  }

  if (btnToggleVoice) {
    btnToggleVoice.addEventListener('click', () => {
      currentSettings.voiceEnabled = !currentSettings.voiceEnabled;
      applySettingsToDOM(currentSettings);
      if (currentSettings.voiceEnabled) playPanpakapanFanfare();
    });
  }

  btnQuickHelp.addEventListener('click', () => handleUserSubmission('help'));
  btnQuickSettings.addEventListener('click', toggleSettings);
  btnQuickExit.addEventListener('click', () => handleUserSubmission('exit'));

  menuHelp.addEventListener('click', () => handleUserSubmission('help'));
  if (menuAgentDemo) menuAgentDemo.addEventListener('click', () => handleUserSubmission('tools'));
  menuSettings.addEventListener('click', toggleSettings);
  menuStatus.addEventListener('click', () => handleUserSubmission('status'));
  menuClear.addEventListener('click', () => handleUserSubmission('clear'));

  btnToggleCompact.addEventListener('click', () => {
    const isCompact = currentSettings.screenWidth <= 82;
    currentSettings.screenWidth = isCompact ? 92 : 80;
    currentSettings.screenHeight = isCompact ? 92 : 82;
    applySettingsToDOM(currentSettings);
  });

  btnToggleFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      currentSettings.screenWidth = 100;
      currentSettings.screenHeight = 100;
      currentSettings.cornerRadius = 0;
    } else {
      document.exitFullscreen?.().catch(() => {});
      currentSettings.screenWidth = 92;
      currentSettings.screenHeight = 92;
      currentSettings.cornerRadius = 18;
    }
    applySettingsToDOM(currentSettings);
  });

  if (selPersonaMode) {
    selPersonaMode.addEventListener('change', () => {
      currentSettings.personaMode = selPersonaMode.value;
      applySettingsToDOM(currentSettings);
    });
  }

  if (selLive2dModel) {
    selLive2dModel.addEventListener('change', () => {
      currentSettings.live2dModel = selLive2dModel.value;
      applySettingsToDOM(currentSettings);
    });
  }

  if (chkVoiceEnabled) {
    chkVoiceEnabled.addEventListener('change', () => {
      currentSettings.voiceEnabled = chkVoiceEnabled.checked;
      applySettingsToDOM(currentSettings);
    });
  }

  if (chkLiveAvatar) {
    chkLiveAvatar.addEventListener('change', () => {
      currentSettings.liveAvatar = chkLiveAvatar.checked;
      applySettingsToDOM(currentSettings);
    });
  }

  chkSaveMemory.addEventListener('change', () => {
    currentSettings.saveMemory = chkSaveMemory.checked;
    applySettingsToDOM(currentSettings);
  });

  rngContextDepth.addEventListener('input', () => {
    const val = Number(rngContextDepth.value);
    currentSettings.contextDepth = val >= 52 ? 52 : val;
    applySettingsToDOM(currentSettings);
  });

  if (memoryPresets) {
    memoryPresets.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentSettings.contextDepth = Number(btn.dataset.depth);
        applySettingsToDOM(currentSettings);
      });
    });
  }

  if (chkInternetSearch) {
    chkInternetSearch.addEventListener('change', () => {
      currentSettings.internetSearch = chkInternetSearch.checked;
      applySettingsToDOM(currentSettings);
    });
  }

  if (selSpeedMode) {
    selSpeedMode.addEventListener('change', () => {
      currentSettings.speedMode = selSpeedMode.value;
      applySettingsToDOM(currentSettings);
    });
  }

  btnExportMemory.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), history: chatHistory }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arisu_chat_memory.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  btnClearMemory.addEventListener('click', async () => {
    await clearConversationMemory();
  });

  selFontFamily.addEventListener('change', () => {
    currentSettings.fontFamily = selFontFamily.value;
    applySettingsToDOM(currentSettings);
  });

  rngFontSize.addEventListener('input', () => {
    currentSettings.fontSize = Number(rngFontSize.value);
    fontSizePresets.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.size) === currentSettings.fontSize);
    });
    applySettingsToDOM(currentSettings);
  });

  fontSizePresets.querySelectorAll('.pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSettings.fontSize = Number(btn.dataset.size);
      fontSizePresets.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applySettingsToDOM(currentSettings);
    });
  });

  themePresets.querySelectorAll('.theme-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.theme;
      const preset = THEMES[key];
      if (!preset) return;
      themePresets.querySelectorAll('.theme-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentSettings.theme = key;
      currentSettings.accentColor = preset.accent;
      currentSettings.secondaryColor = preset.secondary;
      currentSettings.arisuColor = preset.arisu;
      currentSettings.textColor = preset.text;
      currentSettings.bgColor = preset.bg;
      applySettingsToDOM(currentSettings);
    });
  });

  clrAccent.addEventListener('input', () => {
    currentSettings.accentColor = clrAccent.value;
    applySettingsToDOM(currentSettings);
  });

  clrText.addEventListener('input', () => {
    currentSettings.textColor = clrText.value;
    applySettingsToDOM(currentSettings);
  });

  clrArisu.addEventListener('input', () => {
    currentSettings.arisuColor = clrArisu.value;
    applySettingsToDOM(currentSettings);
  });

  clrBg.addEventListener('input', () => {
    currentSettings.bgColor = clrBg.value;
    applySettingsToDOM(currentSettings);
  });

  screenSizePresets.querySelectorAll('.pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSettings.screenWidth = Number(btn.dataset.w);
      currentSettings.screenHeight = Number(btn.dataset.h);
      currentSettings.cornerRadius = Number(btn.dataset.r);
      screenSizePresets.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applySettingsToDOM(currentSettings);
    });
  });

  rngScreenWidth.addEventListener('input', () => {
    currentSettings.screenWidth = Number(rngScreenWidth.value);
    applySettingsToDOM(currentSettings);
  });

  rngScreenHeight.addEventListener('input', () => {
    currentSettings.screenHeight = Number(rngScreenHeight.value);
    applySettingsToDOM(currentSettings);
  });

  rngCornerRadius.addEventListener('input', () => {
    currentSettings.cornerRadius = Number(rngCornerRadius.value);
    applySettingsToDOM(currentSettings);
  });

  btnSaveSystemPrompt.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: txtSystemPrompt.value })
      });
      const data = await res.json();
      if (data.ok) {
        appendSystemBox(`Đã lưu cập nhật vào file <code>system_prompt.json</code>.`);
      }
    } catch (e) {}
  });

  btnReloadSystemPrompt.addEventListener('click', () => {
    reloadSystemPromptFromDisk(true);
  });

  btnResetSettings.addEventListener('click', () => {
    currentSettings = { ...DEFAULT_SETTINGS };
    applySettingsToDOM(currentSettings);
  });

  async function initApp() {
    try {
      const localSaved = localStorage.getItem('arisu_kali_settings');
      if (localSaved) {
        currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localSaved) };
      }
    } catch (e) {}

    renderBanner();
    initInteractiveLive2D();

    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.ok) {
        serverStatus = data;
        if (data.savedSettings) {
          currentSettings = { ...currentSettings, ...data.savedSettings };
        }
        if (data.config && data.config.system_prompt) {
          txtSystemPrompt.value = data.config.system_prompt;
        }
      }
    } catch (e) {}

    applySettingsToDOM(currentSettings, false);
    await refreshServerStatus();

    if (currentSettings.saveMemory) {
      try {
        const memRes = await fetch('/api/memory');
        const memData = await memRes.json();
        if (memData.ok && Array.isArray(memData.history) && memData.history.length > 0) {
          chatHistory = memData.history;
        } else {
          const localHist = localStorage.getItem('arisu_chat_history');
          if (localHist) chatHistory = JSON.parse(localHist);
        }
      } catch (e) {}
    }

    updateBadges();

    if (chatHistory.length > 0) {
      appendSystemBox(
        `Đã khôi phục <b>${chatHistory.length}</b> tin nhắn từ Bộ nhớ RAG (<code>chat_memory.json</code>).`
      );
      for (const item of chatHistory.slice(-10)) {
        if (item.role === 'user') {
          appendUserTerminalBlock(item.content);
        } else {
          createArisuTerminalBlock(item.content, false);
        }
      }
    } else {
      const greeting =
        serverStatus.character?.greeting ||
        'Panpakapan~! Hệ thống Terminal AI Agent v4.0 đã khởi động! Chào mừng Sensei đăng nhập vào căn cứ Câu lạc bộ Phát triển Game!';
      createArisuTerminalBlock(greeting, false);
    }

    setInterval(refreshServerStatus, 3000);
    terminalInput.focus();
  }

  initApp();
})();
