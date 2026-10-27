/**
 * Futuristic Sci-Fi Glassmorphic AI Control Panel for NEVEA
 * Features:
 * - Draggable HUD overlay across screen
 * - Dismissible with smooth exit animation & cute floating reopen widget
 * - Audio Waveform Visualizer & state aura glow (Idle, Listen, Think, Speak, Sleep)
 * - Safe ChromaDB fallback with "Simulated Vector Memory Active" badge
 * - In-app Security Permission Gate modal for guarded OS tools
 */

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
      </div>

      <!-- Prompt Input Form -->
      <form id="ai-chat-form" class="ai-input-form">
        <input 
          type="text" 
          id="ai-prompt-input" 
          class="ai-input" 
          placeholder="Ask Nevea (e.g. 'Open Chrome', 'What's on screen?')" 
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
        <button type="button" class="quick-tag" data-cmd="Inspect my screen and tell me what you see">👁️ See Screen</button>
        <button type="button" class="quick-tag" data-cmd="Open Google Chrome">🌐 Launch App</button>
        <button type="button" class="quick-tag" data-cmd="Remember that my favorite dessert is Japanese mochi">🧠 Save Fact</button>
        <button type="button" class="quick-tag" data-cmd="What are my saved personal preferences?">🔍 Recall</button>
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
