/**
 * Futuristic Sci-Fi Glassmorphic AI Control Panel for NEVEA
 * Features:
 * - Draggable HUD overlay across screen
 * - Dismissible with smooth exit animation & cute floating reopen widget
 * - Audio Waveform Visualizer & state aura glow (Idle, Listen, Think, Speak, Sleep)
 * - Safe ChromaDB fallback with "Simulated Vector Memory Active" badge
 * - In-app Security Permission Gate modal for guarded OS tools
 */

import {
  signInGoogleWorkspace,
  signOutGoogleWorkspace,
  listDriveFiles,
  searchDriveFiles,
  createDriveTextFile,
  deleteDriveFile,
  listPresentations,
  createPresentation,
  subscribeToWorkspaceAuth,
  getWorkspaceAccessToken,
} from './services/googleWorkspace.js';

export function createAIPanel(aiEngine, creature) {
  const existing = document.getElementById('nevea-ai-panel-wrapper');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'nevea-ai-panel-wrapper';

  wrapper.innerHTML = `
    <!-- Floating Reopen Widget (shown when panel is dismissed) -->
    <button type="button" id="nevea-reopen-widget" class="nevea-reopen-widget" style="display: none;" title="Open NEVEA AI Companion HUD">
      <img src="/logo.svg" alt="Nevea Logo" class="reopen-logo" />
      <span class="reopen-status-dot"></span>
      <span class="reopen-badge">NEVEA</span>
    </button>

    <!-- Main Draggable Sci-Fi Glass Panel -->
    <div id="nevea-ai-panel" class="ai-glass-panel">
      <!-- Drag Handle Header -->
      <div class="ai-header" id="ai-drag-handle">
        <div class="ai-brand">
          <div class="logo-aura">
            <img src="/logo.svg" alt="Nevea" class="ai-logo-icon" />
          </div>
          <div>
            <div class="brand-row">
              <h2 class="ai-title">NEVEA</h2>
              <span class="ai-chip">OS BRAIN</span>
            </div>
            <span class="ai-sub">Sentient 3D Desktop Fluff</span>
          </div>
        </div>

        <div class="header-right">
          <div id="ai-mood-badge" class="ai-mood-badge mood-idle">
            <span class="mood-dot"></span>
            <span id="ai-mood-text">IDLE</span>
          </div>
          <button type="button" id="btn-close-hud" class="btn-hud-control" title="Minimize to floating orb">&times;</button>
        </div>
      </div>

      <!-- Real-Time Voice Waveform Visualizer -->
      <div id="waveform-hud" class="waveform-container">
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
        <div class="waveform-bar"></div>
      </div>

      <!-- 5-State Emotion Engine Switcher -->
      <div class="ai-states-row" aria-label="Companion Mood States">
        <button type="button" class="state-chip active" data-state="idle">Idle</button>
        <button type="button" class="state-chip" data-state="listening">Listen</button>
        <button type="button" class="state-chip" data-state="thinking">Think</button>
        <button type="button" class="state-chip" data-state="speaking">Speak</button>
        <button type="button" class="state-chip" data-state="sleeping">Sleep</button>
      </div>

      <!-- Output Speech Bubble with Sci-Fi Accent -->
      <div id="ai-bubble" class="ai-speech-bubble">
        "Hi! I'm Nevea, your sentient white fluffy companion. I'm ready to talk, inspect your screen, or control your operating system."
      </div>

      <!-- Action Buttons Row -->
      <div class="ai-actions-row">
        <button type="button" id="btn-voice" class="ai-action-btn primary" title="Voice Talk">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <span>Voice</span>
        </button>

        <button type="button" id="btn-vision" class="ai-action-btn secondary" title="Inspect screen view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect width="20" height="14" x="2" y="3" rx="2"/>
            <line x1="8" x2="16" y1="21" y2="21"/>
            <line x1="12" x2="12" y1="17" y2="21"/>
          </svg>
          <span>Vision</span>
        </button>

        <button type="button" id="btn-memory" class="ai-action-btn tertiary" title="ChromaDB Long-Term Memory">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
          </svg>
          <span>Memory</span>
        </button>

        <button type="button" id="btn-workspace" class="ai-action-btn" title="Google Drive & Slides Workspace" style="background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.3); color: #a5b4fc;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M7 8h10"/>
            <path d="M7 12h10"/>
            <path d="M7 16h10"/>
          </svg>
          <span>Workspace</span>
        </button>
      </div>

      <!-- Prompt Input Form -->
      <form id="ai-chat-form" class="ai-input-form">
        <input 
          type="text" 
          id="ai-prompt-input" 
          class="ai-input" 
          placeholder="Ask Nevea (e.g. 'Search Drive', 'Create slides')" 
          autocomplete="off"
        />
        <button type="submit" class="ai-submit-btn" aria-label="Send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>

      <!-- Quick Commands -->
      <div class="ai-quick-tags">
        <button type="button" class="quick-tag" data-cmd="List my Google Drive files">📂 Drive Files</button>
        <button type="button" class="quick-tag" data-cmd="Create a Google Slide presentation about Space Exploration">📊 Slides Deck</button>
        <button type="button" class="quick-tag" data-cmd="Inspect my screen and tell me what you see">👁️ See Screen</button>
        <button type="button" class="quick-tag" data-cmd="Open Google Chrome">🌐 Launch App</button>
      </div>

      <!-- Google Workspace (Drive & Slides) Drawer -->
      <div id="ai-workspace-drawer" class="ai-memory-drawer" style="display: none;">
        <div class="memory-header">
          <div class="memory-title-wrap">
            <h4>Google Workspace</h4>
            <span class="memory-active-badge" id="ws-auth-badge" style="background: rgba(99, 102, 241, 0.2); border-color: rgba(99, 102, 241, 0.4); color: #c7d2fe;">DRIVE & SLIDES</span>
          </div>
          <button type="button" id="close-workspace-btn" class="close-btn">&times;</button>
        </div>
        <div id="workspace-content" class="memory-list" style="display: flex; flex-direction: column; gap: 8px;">
          <div id="ws-auth-section" style="padding: 4px 0;">
            <button type="button" id="btn-ws-connect" class="modal-btn confirm" style="width: 100%; justify-content: center; font-size: 11px; padding: 8px;">Connect Google Drive & Slides</button>
          </div>
          <div id="ws-active-section" style="display: none; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span id="ws-user-display" style="font-size: 10px; color: #38bdf8; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">Connected</span>
              <button type="button" id="btn-ws-signout" style="background: none; border: none; color: #f87171; font-size: 10px; cursor: pointer;">Sign Out</button>
            </div>
            <div style="display: flex; gap: 4px;">
              <button type="button" id="ws-tab-drive" class="state-chip active" style="flex: 1; font-size: 10px; padding: 4px;">Google Drive</button>
              <button type="button" id="ws-tab-slides" class="state-chip" style="flex: 1; font-size: 10px; padding: 4px;">Google Slides</button>
            </div>
            <div id="ws-drive-view" style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; gap: 4px;">
                <input type="text" id="ws-drive-search" class="ai-input" placeholder="Search Drive..." style="font-size: 11px; padding: 4px 8px; height: 26px;" />
                <button type="button" id="btn-ws-search" class="quick-tag" style="padding: 2px 8px;">Search</button>
              </div>
              <div style="display: flex; gap: 4px;">
                <button type="button" id="btn-ws-new-doc" class="quick-tag" style="background: rgba(14, 165, 233, 0.2); border-color: rgba(14, 165, 233, 0.4); color: #bae6fd;">+ New Note in Drive</button>
              </div>
              <div id="ws-drive-files-list" style="display: flex; flex-direction: column; gap: 4px; max-height: 130px; overflow-y: auto;">
                Loading Drive files...
              </div>
            </div>
            <div id="ws-slides-view" style="display: none; flex-direction: column; gap: 6px;">
              <div style="display: flex; gap: 4px;">
                <input type="text" id="ws-slide-title" class="ai-input" placeholder="Deck Title (e.g. AI Deck)" style="font-size: 11px; padding: 4px 8px; height: 26px;" />
                <button type="button" id="btn-ws-create-deck" class="quick-tag" style="background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); color: #fcd34d;">+ Create Deck</button>
              </div>
              <div id="ws-slides-list" style="display: flex; flex-direction: column; gap: 4px; max-height: 130px; overflow-y: auto;">
                Loading presentations...
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ChromaDB Memory Drawer -->
      <div id="ai-memory-drawer" class="ai-memory-drawer" style="display: none;">
        <div class="memory-header">
          <div class="memory-title-wrap">
            <h4>ChromaDB Vector Store</h4>
            <span class="memory-active-badge">SIMULATED MEMORY ACTIVE</span>
          </div>
          <button type="button" id="close-memory-btn" class="close-btn">&times;</button>
        </div>
        <div id="memory-list" class="memory-list">Loading memories...</div>
      </div>
    </div>

    <!-- Security Permission Gate Modal -->
    <div id="permission-gate-modal" class="permission-modal-backdrop" style="display: none;">
      <div class="permission-modal-card">
        <div class="modal-glow"></div>
        <div class="modal-header">
          <span class="shield-icon">🛡️</span>
          <div>
            <h3 class="modal-title">Security Permission Gate</h3>
            <span class="modal-sub">Protected OS Action Request</span>
          </div>
        </div>
        <p class="modal-msg" id="perm-action-desc">NEVEA requests permission to execute a system operation.</p>
        <div class="modal-actions">
          <button type="button" id="btn-perm-deny" class="modal-btn cancel">Block & Cancel</button>
          <button type="button" id="btn-perm-allow" class="modal-btn confirm">Allow Action</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  const panel = wrapper.querySelector('#nevea-ai-panel');
  const reopenWidget = wrapper.querySelector('#nevea-reopen-widget');
  const dragHandle = wrapper.querySelector('#ai-drag-handle');
  const btnCloseHud = wrapper.querySelector('#btn-close-hud');
  const bubble = wrapper.querySelector('#ai-bubble');
  const moodBadge = wrapper.querySelector('#ai-mood-badge');
  const moodText = wrapper.querySelector('#ai-mood-text');
  const waveform = wrapper.querySelector('#waveform-hud');
  const promptInput = wrapper.querySelector('#ai-prompt-input');
  const chatForm = wrapper.querySelector('#ai-chat-form');
  const btnVoice = wrapper.querySelector('#btn-voice');
  const btnVision = wrapper.querySelector('#btn-vision');
  const btnMemory = wrapper.querySelector('#btn-memory');
  const memoryDrawer = wrapper.querySelector('#ai-memory-drawer');
  const closeMemoryBtn = wrapper.querySelector('#close-memory-btn');
  const memoryList = wrapper.querySelector('#memory-list');

  // Permission Gate elements
  const permModal = wrapper.querySelector('#permission-gate-modal');
  const permDesc = wrapper.querySelector('#perm-action-desc');
  const btnPermAllow = wrapper.querySelector('#btn-perm-allow');
  const btnPermDeny = wrapper.querySelector('#btn-perm-deny');

  // --------------------------------------------------------------------------
  // 1. Smooth Dragging Implementation (Zero external dependency overhead)
  // --------------------------------------------------------------------------
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  dragHandle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    panel.setPointerCapture(e.pointerId);
    panel.classList.add('is-dragging');
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const x = Math.max(12, Math.min(window.innerWidth - panel.offsetWidth - 12, e.clientX - dragOffset.x));
    const y = Math.max(12, Math.min(window.innerHeight - panel.offsetHeight - 12, e.clientY - dragOffset.y));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
  });

  window.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      panel.classList.remove('is-dragging');
    }
  });

  // --------------------------------------------------------------------------
  // 2. Dismiss & Floating Reopen Widget
  // --------------------------------------------------------------------------
  btnCloseHud.addEventListener('click', () => {
    panel.classList.add('anim-dismiss');
    setTimeout(() => {
      panel.style.display = 'none';
      panel.classList.remove('anim-dismiss');
      reopenWidget.style.display = 'flex';
      reopenWidget.classList.add('anim-pop');
    }, 250);
  });

  reopenWidget.addEventListener('click', () => {
    reopenWidget.style.display = 'none';
    panel.style.display = 'flex';
    panel.classList.add('anim-open');
    setTimeout(() => panel.classList.remove('anim-open'), 300);
  });

  // --------------------------------------------------------------------------
  // 3. Mood & Waveform Synchronization
  // --------------------------------------------------------------------------
  function setMoodUI(state, text) {
    moodBadge.className = `ai-mood-badge mood-${state}`;
    moodText.textContent = state.toUpperCase();
    if (text) bubble.textContent = text;

    wrapper.querySelectorAll('.state-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-state') === state);
    });

    if (state === 'speaking') {
      waveform.classList.add('active');
    } else {
      waveform.classList.remove('active');
    }
  }

  aiEngine.onStatusChange = ({ state, message }) => {
    setMoodUI(state, message);
  };

  // State Chips
  wrapper.querySelectorAll('.state-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = btn.getAttribute('data-state');
      creature.setCompanionState(state);
      setMoodUI(state, `Switched state to ${state}.`);
    });
  });

  // Submit Prompt
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = promptInput.value.trim();
    if (!query) return;
    promptInput.value = '';
    const needsVision = /screen|window|desktop|look|see|inspect/i.test(query);
    await aiEngine.sendTurn({ prompt: query, includeScreen: needsVision });
  });

  // Quick Tags
  wrapper.querySelectorAll('.quick-tag').forEach(tag => {
    tag.addEventListener('click', async () => {
      const cmd = tag.getAttribute('data-cmd');
      const needsVision = cmd.includes('screen');
      await aiEngine.sendTurn({ prompt: cmd, includeScreen: needsVision });
    });
  });

  // Voice Button
  btnVoice.addEventListener('click', () => {
    aiEngine.toggleListening();
  });

  // Vision Button
  btnVision.addEventListener('click', async () => {
    await aiEngine.sendTurn({
      prompt: 'Inspect my screen view and let me know what apps, windows, or code are open.',
      includeScreen: true,
    });
  });

  // Memory Drawer
  btnMemory.addEventListener('click', async () => {
    const isHidden = memoryDrawer.style.display === 'none';
    memoryDrawer.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      try {
        const res = await fetch('/api/memory');
        const raw = await res.text();
        const data = raw ? JSON.parse(raw) : { memories: [] };
        if (data.memories && data.memories.length > 0) {
          memoryList.innerHTML = data.memories
            .map(m => `
              <div class="memory-card">
                <span class="memory-tag">${m.key}</span>
                <p class="memory-content">${m.content}</p>
                <span class="memory-date">${new Date(m.timestamp).toLocaleDateString()}</span>
              </div>
            `).join('');
        } else {
          memoryList.innerHTML = '<p class="empty-memo">Simulated Vector Memory ready. Ask Nevea: "Remember that I like..."</p>';
        }
      } catch {
        memoryList.innerHTML = '<p class="empty-memo">Simulated Vector Memory ready.</p>';
      }
    }
  });

  closeMemoryBtn.addEventListener('click', () => {
    memoryDrawer.style.display = 'none';
  });

  // --------------------------------------------------------------------------
  // 3b. Google Workspace (Drive & Slides) Drawer Handlers
  // --------------------------------------------------------------------------
  const btnWorkspace = wrapper.querySelector('#btn-workspace');
  const workspaceDrawer = wrapper.querySelector('#ai-workspace-drawer');
  const closeWorkspaceBtn = wrapper.querySelector('#close-workspace-btn');
  const btnWsConnect = wrapper.querySelector('#btn-ws-connect');
  const btnWsSignout = wrapper.querySelector('#btn-ws-signout');
  const wsAuthSection = wrapper.querySelector('#ws-auth-section');
  const wsActiveSection = wrapper.querySelector('#ws-active-section');
  const wsUserDisplay = wrapper.querySelector('#ws-user-display');
  const wsAuthBadge = wrapper.querySelector('#ws-auth-badge');
  const wsTabDrive = wrapper.querySelector('#ws-tab-drive');
  const wsTabSlides = wrapper.querySelector('#ws-tab-slides');
  const wsDriveView = wrapper.querySelector('#ws-drive-view');
  const wsSlidesView = wrapper.querySelector('#ws-slides-view');
  const wsDriveFilesList = wrapper.querySelector('#ws-drive-files-list');
  const wsSlidesList = wrapper.querySelector('#ws-slides-list');
  const wsDriveSearch = wrapper.querySelector('#ws-drive-search');
  const btnWsSearch = wrapper.querySelector('#btn-ws-search');
  const btnWsNewDoc = wrapper.querySelector('#btn-ws-new-doc');
  const wsSlideTitle = wrapper.querySelector('#ws-slide-title');
  const btnWsCreateDeck = wrapper.querySelector('#btn-ws-create-deck');

  async function refreshWorkspaceUI() {
    if (!getWorkspaceAccessToken()) return;
    try {
      const [driveFiles, presentations] = await Promise.all([
        listDriveFiles(10).catch(() => []),
        listPresentations(10).catch(() => []),
      ]);

      if (driveFiles.length > 0) {
        wsDriveFilesList.innerHTML = driveFiles
          .map(
            (f) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${f.name}">${f.name}</span>
            <div style="display: flex; gap: 4px;">
              ${f.webViewLink ? `<a href="${f.webViewLink}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none;">Open</a>` : ''}
              <button type="button" class="del-file-btn" data-id="${f.id}" data-name="${f.name}" style="background: none; border: none; color: #f87171; cursor: pointer; font-size: 10px;">Del</button>
            </div>
          </div>
        `
          )
          .join('');

        wsDriveFilesList.querySelectorAll('.del-file-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const fileId = btn.getAttribute('data-id');
            const fileName = btn.getAttribute('data-name');
            const confirmed = await window.neveaRequestPermission(
              'delete_file',
              `Permanently delete "${fileName}" from Google Drive`
            );
            if (confirmed) {
              await deleteDriveFile(fileId).catch((err) => alert(err.message));
              refreshWorkspaceUI();
            }
          });
        });
      } else {
        wsDriveFilesList.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">No files found in Drive</span>';
      }

      if (presentations.length > 0) {
        wsSlidesList.innerHTML = presentations
          .map(
            (p) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${p.name}">📊 ${p.name}</span>
            ${p.webViewLink ? `<a href="${p.webViewLink}" target="_blank" rel="noopener noreferrer" style="color: #fcd34d; text-decoration: none;">Edit</a>` : ''}
          </div>
        `
          )
          .join('');
      } else {
        wsSlidesList.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">No presentations found. Click "+ Create Deck"</span>';
      }
    } catch (err) {
      console.warn('Workspace refresh error:', err);
    }
  }

  subscribeToWorkspaceAuth((state) => {
    if (state.isAuthenticated && state.hasToken) {
      wsAuthSection.style.display = 'none';
      wsActiveSection.style.display = 'flex';
      wsUserDisplay.textContent = state.user?.displayName || state.user?.email || 'Connected';
      wsAuthBadge.textContent = 'CONNECTED';
      wsAuthBadge.style.color = '#34d399';
      refreshWorkspaceUI();
    } else {
      wsAuthSection.style.display = 'block';
      wsActiveSection.style.display = 'none';
      wsAuthBadge.textContent = 'DISCONNECTED';
      wsAuthBadge.style.color = '#94a3b8';
    }
  });

  btnWorkspace.addEventListener('click', () => {
    const isHidden = workspaceDrawer.style.display === 'none';
    workspaceDrawer.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      memoryDrawer.style.display = 'none';
      refreshWorkspaceUI();
    }
  });

  closeWorkspaceBtn.addEventListener('click', () => {
    workspaceDrawer.style.display = 'none';
  });

  btnWsConnect.addEventListener('click', async () => {
    try {
      await signInGoogleWorkspace();
      bubble.textContent = "Connected to your Google Drive and Slides! What would you like to create or find?";
    } catch (err) {
      alert(err.message || 'Connection failed');
    }
  });

  btnWsSignout.addEventListener('click', async () => {
    await signOutGoogleWorkspace();
    bubble.textContent = "Signed out of Google Workspace.";
  });

  wsTabDrive.addEventListener('click', () => {
    wsTabDrive.classList.add('active');
    wsTabSlides.classList.remove('active');
    wsDriveView.style.display = 'flex';
    wsSlidesView.style.display = 'none';
  });

  wsTabSlides.addEventListener('click', () => {
    wsTabSlides.classList.add('active');
    wsTabDrive.classList.remove('active');
    wsSlidesView.style.display = 'flex';
    wsDriveView.style.display = 'none';
  });

  btnWsSearch.addEventListener('click', async () => {
    const q = wsDriveSearch.value.trim();
    if (!q) return refreshWorkspaceUI();
    wsDriveFilesList.innerHTML = 'Searching...';
    try {
      const results = await searchDriveFiles(q);
      if (results.length > 0) {
        wsDriveFilesList.innerHTML = results
          .map(
            (f) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${f.name}">${f.name}</span>
            ${f.webViewLink ? `<a href="${f.webViewLink}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none;">Open</a>` : ''}
          </div>
        `
          )
          .join('');
      } else {
        wsDriveFilesList.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">No matching files</span>';
      }
    } catch (err) {
      wsDriveFilesList.innerHTML = `<span style="color: #f87171; font-size: 10px;">${err.message}</span>`;
    }
  });

  btnWsNewDoc.addEventListener('click', async () => {
    const title = prompt('Enter document name (e.g. "Meeting Notes.txt"):', 'Nevea_Note.txt');
    if (!title) return;
    const content = prompt('Enter notes content:', 'Created with Nevea 3D Desktop Companion.');
    if (content === null) return;
    try {
      const res = await createDriveTextFile(title, content);
      bubble.textContent = `Created "${res.name}" in your Google Drive!`;
      refreshWorkspaceUI();
    } catch (err) {
      alert(err.message || 'Failed to create document');
    }
  });

  btnWsCreateDeck.addEventListener('click', async () => {
    const title = wsSlideTitle.value.trim() || 'Nevea AI Deck';
    wsSlideTitle.value = '';
    bubble.textContent = `Creating presentation "${title}" in Google Slides...`;
    try {
      const sampleSlides = [
        {
          title: title,
          subtitle: 'Created autonomously by Nevea 3D Companion',
          bullets: ['Connected to Google Slides API', 'Real-time sync', 'Multi-modal desktop agent'],
        },
        {
          title: 'Capabilities',
          subtitle: 'Full Desktop & Cloud Integration',
          bullets: ['Google Drive storage', 'Google Slides automation', 'Physical 3D Marschner fur companion'],
        },
      ];
      const res = await createPresentation(title, sampleSlides);
      bubble.textContent = `Created presentation "${res.title}" in Google Slides! Link ready.`;
      refreshWorkspaceUI();
    } catch (err) {
      alert(err.message || 'Failed to create presentation');
    }
  });

  // --------------------------------------------------------------------------
  // 4. In-App Permission Gate Modal Trigger
  // --------------------------------------------------------------------------
  window.neveaRequestPermission = function(toolName, details) {
    return new Promise((resolve) => {
      permDesc.textContent = `NEVEA requests permission to perform: ${toolName} (${details || 'system action'}). Do you wish to allow this?`;
      permModal.style.display = 'flex';

      const allowHandler = () => {
        cleanup();
        resolve(true);
      };

      const denyHandler = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        btnPermAllow.removeEventListener('click', allowHandler);
        btnPermDeny.removeEventListener('click', denyHandler);
        permModal.style.display = 'none';
      };

      btnPermAllow.addEventListener('click', allowHandler);
      btnPermDeny.addEventListener('click', denyHandler);
    });
  };

  return {
    setMoodUI,
  };
}
