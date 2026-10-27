# NEVEA — Sentient 3D AI Desktop Companion

> **A real-time, 3D desktop companion with physical shell-and-fin fur physics, full OS automation, multimodal vision, real-time voice, and long-term ChromaDB vector memory.**

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                              DESKTOP OS                                 |
|  +-------------------------------------------------------------------+  |
|  |           NEVEA ELECTRON APP (Frameless, Always-On-Top)           |  |
|  |  +---------------------------+  +-------------------------------+ |  |
|  |  |    3D WebGL2/WebGPU Fur   |  |   Glassmorphic AI HUD Panel   | |  |
|  |  |  64-Layer Shells + Fins   |  |   Voice, Vision, State Sync   | |  |
|  |  |  5-State Animation Engine |  |   Emotion / Memory Drawer     | |  |
|  |  +---------------------------+  +-------------------------------+ |  |
|  +-----------------------------------|-------------------------------+  |
|                                      | IPC Bridge                       |
|  +-----------------------------------|-------------------------------+  |
|  |  Node.js / Express Server API    | Python OS Automation Daemon   |  |
|  |  - Gemini 1.5 Pro / Flash        | - PyAutoGUI (typing/keys)     |  |
|  |  - Multimodal Vision Pipeline    | - PyGetWindow (manage windows)|  |
|  |  - Gemini Live Audio WebSocket   | - ChromaDB (persistent RAG)   |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## Quick Start: Local Export & Setup Guide

### 1. Export Code from AI Studio to Your Local Machine
From the AI Studio UI top navigation, click **Export** (or download the ZIP bundle of this repository), then extract the folder on your computer:
```bash
unzip nevea-desktop-companion.zip -d nevea-desktop-companion
cd nevea-desktop-companion
```

Alternatively, if cloning from GitHub / Git:
```bash
git clone <your-repository-url> nevea-desktop-companion
cd nevea-desktop-companion
```

---

### 2. Prerequisites Installation

#### A. Node.js (v20 or v22 LTS recommended)
- **Windows / macOS**: Download installer from [nodejs.org](https://nodejs.org/).
- **Linux (Debian/Ubuntu)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

#### B. Python 3.10+ & Virtual Environment
- **Windows**: Install Python from python.org (ensure "Add python.exe to PATH" is checked).
- **macOS**: `brew install python`
- **Linux**: `sudo apt install python3 python3-pip python3-venv`

---

### 3. Install All Project Dependencies

#### Install Node.js & Electron Dependencies:
```bash
npm install
```

#### Install Python OS Automation & ChromaDB Dependencies:
```bash
# Create and activate virtual environment
python3 -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Install Python requirements
pip install -r backend/requirements.txt
```

---

### 4. Configure Gemini API Key

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env` and insert your Gemini API Key from Google AI Studio:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
PORT=3000
NODE_ENV="development"
```

---

### 5. Running NEVEA Locally

#### Option A: Run Full Desktop Companion (Electron + 3D Viewport + Python Backend)
```bash
npm run electron:dev
```
*This launches:*
1. The Vite local server with hot module reload on port 3000.
2. The Electron frameless, transparent, always-on-top desktop window.
3. The Python OS automation daemon running PyAutoGUI & ChromaDB.

#### Option B: Run in Web Browser
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in Chrome, Edge, or Brave.

---

### 6. Building the Final Desktop Executable

Build standalone installable desktop binaries for your operating system:

#### Windows (`.exe` Installer & Portable):
```bash
npm run electron:build -- --win
```
*Output:* `dist-electron/Nevea Desktop Companion Setup.exe`

#### macOS (`.dmg` & `.zip` for Apple Silicon & Intel):
```bash
npm run electron:build -- --mac
```
*Output:* `dist-electron/Nevea Desktop Companion.dmg`

#### Linux (`.AppImage` & `.deb`):
```bash
npm run electron:build -- --linux
```
*Output:* `dist-electron/Nevea Desktop Companion.AppImage`

---

## Features & Voice Commands Reference

| Command / Prompt | AI Tool Executed | Action Taken |
| :--- | :--- | :--- |
| `"Open Chrome"` / `"Launch Photoshop"` | `open_application` | Launches the desktop program via system shell |
| `"Type 'Hello World'"` | `type_text` | PyAutoGUI types text directly into the foreground window |
| `"Send WhatsApp to Mom saying I'll be home soon"` | `send_whatsapp` | Opens WhatsApp Web with pre-filled message |
| `"Minimize all windows"` | `manage_window` | Minimizes desktop windows via PyGetWindow / Shell |
| `"Look at my screen and help me debug"` | `screen:capture-snapshot` | Captures high-res screenshot & analyzes with Gemini Vision |
| `"Remember my favorite coffee is Oat Vanilla Latte"` | `store_memory` | Vectorizes fact & stores in ChromaDB collection |
| `"What do you remember about my preferences?"` | `recall_memory` | Performs cosine similarity search across ChromaDB |

---

## 5 Companion Animation States
1. **IDLE**: Calm natural breathing, floating bob, gazes smoothly at mouse cursor, periodic organic double-blinks.
2. **LISTENING**: Ears perk alertly forward, head tilts toward the user, eyes open wide, ready for command.
3. **THINKING**: Gaze drifts upward-left/right, gentle float roll, cognitive thought processing.
4. **SPEAKING**: Mouth oscillates in sync with speech prosody, body bobs rhythmically, ear flutters.
5. **SLEEPING**: Curls up, closed serene eye arcs, deep slow slumber breathing.
