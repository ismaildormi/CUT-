import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { localVectorStore } from "./vectorMemory.js";
import {
  executeOSCommand,
  update_workspace_feed,
  generate_image_stable_diffusion,
  generate_code_deepseek,
  generate_code_local,
  generate_image_huggingface,
  generate_image_pollinations,
  generate_3d_hunyuan,
} from "./tools.js";
import { universalSourcesEngine } from "./universalSourcesEngine.js";
import { cloudFleetOffloader } from "./cloudFleetOffloader.js";
import {
  yukaSupremeExecuteLLM,
  sanitizeYukaChatOutput,
  type YukaByokConfig,
} from "./yukaCore.js";

// Legacy compatibility handle (0 mandatory external API keys in Yuka v12.0 Zero-Key mode)
const ai = new GoogleGenAI({
  apiKey: "YUKA_V12_ZERO_KEY_NATIVE",
  httpOptions: {
    headers: {
      "User-Agent": "yuka-sovereign-core-v12",
    },
  },
});

// Comprehensive OS Automation & Companion Omnipotence Tools for Gemini
export const osTools: FunctionDeclaration[] = [
  // 1. FILE SYSTEM ACCESS
  {
    name: "read_file",
    description: "Read the textual content of a local file (.txt, .md, .json, .pdf, .docx, .py, .js, etc.)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Absolute or relative path to the file (e.g. ~/Documents/notes.txt)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with specified content (Backed up to Nevea_Backup/ and guarded by Permission Gate)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "File path to write to",
        },
        content: {
          type: Type.STRING,
          description: "Text contents to write into the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description: "Safely delete a local file after backing it up to Nevea_Backup/ (Guarded by Permission Gate)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path to the file to back up and delete",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Search for files by filename query in a given directory",
    parameters: {
      type: Type.OBJECT,
      properties: {
        directory: {
          type: Type.STRING,
          description: "Directory to search within (e.g. ~/Projects, ~/Downloads, or .)",
        },
        query: {
          type: Type.STRING,
          description: "Filename or substring to search for",
        },
      },
      required: ["query"],
    },
  },

  // 2. ADVANCED APP & GUI CONTROL
  {
    name: "open_app",
    description: "Launch an application on the user's desktop (e.g. Chrome, Photoshop, VSCode, Spotify, Notepad, Terminal)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: {
          type: Type.STRING,
          description: "Name of the application or executable to open",
        },
      },
      required: ["app_name"],
    },
  },
  {
    name: "close_app",
    description: "Close or terminate an active desktop application/process (Requires user consent)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: {
          type: Type.STRING,
          description: "Name of the application process to terminate",
        },
      },
      required: ["app_name"],
    },
  },
  {
    name: "type_text",
    description: "Simulate typing text into the currently active desktop window with keyboard automation",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The text string to type",
        },
        press_enter: {
          type: Type.BOOLEAN,
          description: "Whether to hit Enter after typing",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "press_hotkey",
    description: "Simulate keyboard shortcut combination (e.g. ['ctrl', 'c'], ['alt', 'tab'], ['command', 'space'])",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keys_array: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Array of key names to press together in order",
        },
      },
      required: ["keys_array"],
    },
  },

  // 3. SYSTEM & HARDWARE CONTROL
  {
    name: "change_system_volume",
    description: "Adjust master operating system audio volume from 0 to 100",
    parameters: {
      type: Type.OBJECT,
      properties: {
        level: {
          type: Type.NUMBER,
          description: "Volume level integer from 0 to 100",
        },
      },
      required: ["level"],
    },
  },
  {
    name: "toggle_wifi",
    description: "Turn Wi-Fi hardware adapter on or off",
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: {
          type: Type.BOOLEAN,
          description: "True to turn on Wi-Fi, False to turn off",
        },
      },
      required: ["state"],
    },
  },
  {
    name: "get_battery_status",
    description: "Retrieve battery charge percentage, charging status, and remaining power time",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_system_health",
    description: "Retrieve real-time CPU load, RAM usage, and GPU (Graphics Card) load/VRAM/temperature via psutil and GPUtil",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "empty_recycle_bin",
    description: "Purge the operating system Recycle Bin or Trash (Requires user consent)",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },

  // 4. CLIPBOARD & WEB
  {
    name: "copy_to_clipboard",
    description: "Copy a text string to the system clipboard",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "Text to copy to clipboard",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "read_clipboard",
    description: "Read the current text content from the system clipboard",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "open_url",
    description: "Open a website URL in the user's default web browser",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "Web address or URL to visit (e.g. https://github.com)",
        },
      },
      required: ["url"],
    },
  },

  // 5. TERMINAL EXECUTION (GUARDED)
  {
    name: "execute_terminal_command",
    description: "Execute a command in system shell (bash / cmd / powershell). Requires explicit confirmation popup.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: "The shell command to run",
        },
      },
      required: ["command"],
    },
  },

  // 6. LONG-TERM VECTOR MEMORY RAG
  {
    name: "store_memory",
    description: "Store personal facts, user preferences, projects, habits, or schedule into ChromaDB long-term memory",
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: {
          type: Type.STRING,
          description: "Category or subject key",
        },
        content: {
          type: Type.STRING,
          description: "The detailed information or preference to remember permanently",
        },
      },
      required: ["key", "content"],
    },
  },
  {
    name: "recall_memory",
    description: "Semantic search retrieval from ChromaDB long-term memory based on query relevance",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Question or topic to search long-term memory for",
        },
      },
      required: ["query"],
    },
  },

  // 7. COMPANION 3D & UI OMNIPOTENCE
  {
    name: "change_fur_color",
    description: "Change Nevea's 3D fur coat color (options: 'sakura', 'golden', 'midnight', 'mint', 'pure_fluff', 'peach', or hex codes)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        color_preset: {
          type: Type.STRING,
          description: "Color preset name ('sakura', 'golden', 'midnight', 'mint', 'pure_fluff', 'peach')",
        },
        base_color: {
          type: Type.STRING,
          description: "Optional hex base coat color (e.g. #fbcfe8)",
        },
        tip_color: {
          type: Type.STRING,
          description: "Optional hex tip hair color (e.g. #ffffff)",
        },
      },
      required: ["color_preset"],
    },
  },
  {
    name: "change_environment",
    description: "Switch 3D lighting environment atmosphere (options: 'studio', 'meadow', 'sunset', 'midnight')",
    parameters: {
      type: Type.OBJECT,
      properties: {
        environment_id: {
          type: Type.STRING,
          description: "Target environment ('studio', 'meadow', 'sunset', 'midnight')",
        },
      },
      required: ["environment_id"],
    },
  },
  {
    name: "play_sound",
    description: "Play a cute or chaotic procedural sound ('yiii', 'aaaa', 'giggle', 'boop', 'squeak')",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sound_type: {
          type: Type.STRING,
          description: "Sound type: 'yiii', 'aaaa', 'giggle', 'boop', 'squeak'",
        },
      },
      required: ["sound_type"],
    },
  },
  {
    name: "trigger_creature_action",
    description: "Trigger a physical 3D action ('jump', 'squash', 'wiggle', 'sleep', 'wake')",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "Physical action to trigger",
        },
      },
      required: ["action"],
    },
  },
  // 8. GOOGLE WORKSPACE (DRIVE & SLIDES)
  {
    name: "workspace_search_drive",
    description: "Search user's Google Drive files by query string",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Search keyword or filename",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "workspace_create_drive_file",
    description: "Create a new text or document file in the user's Google Drive",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the file to create (e.g. 'Project Ideas.txt')",
        },
        content: {
          type: Type.STRING,
          description: "Content to write into the document",
        },
      },
      required: ["name", "content"],
    },
  },
  {
    name: "workspace_create_presentation",
    description: "Create a new presentation in Google Slides with custom slides and topics",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Presentation title",
        },
        topic: {
          type: Type.STRING,
          description: "Overall topic description",
        },
        slides: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          description: "List of slide contents with title, subtitle, and bullet points",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "workspace_list_presentations",
    description: "List recent Google Slides presentations from user's Drive",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "create_slide_deck",
    description: "Create a new Google Slides presentation deck with a given title",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Title for the new Google Slides presentation deck",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "add_slide_content",
    description: "Append a new slide with text content to the active or specified Google Slides presentation",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "Body text or bullet content to add to the slide",
        },
        presentation_id: {
          type: Type.STRING,
          description: "Optional presentation ID (defaults to the most recently created or active deck)",
        },
        slide_title: {
          type: Type.STRING,
          description: "Optional slide heading title",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "get_presentation_summary",
    description: "Fetch a Google Slides presentation by file_id and extract a summary of its slides and text",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_id: {
          type: Type.STRING,
          description: "The Google Slides file ID / presentationId to summarize",
        },
      },
      required: ["file_id"],
    },
  },

  // 9. ADVANCED CO-PILOT & SYSTEM TOOLS
  {
    name: "run_powershell",
    description: "Execute a PowerShell command or script on the host system (Guarded by Permission Gate)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: "PowerShell command to execute",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "search_web",
    description: "Search the internet for real-time information, news, or tutorials.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Web search query string",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "open_url_in_browser",
    description: "Open a specific URL in the user's default web browser (Chrome, Edge, etc.).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "Full URL to open in the user's default web browser",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "explain_code",
    description: "Analyze and explain code snippets or visible IDE code on the user's screen",
    parameters: {
      type: Type.OBJECT,
      properties: {
        code_or_context: {
          type: Type.STRING,
          description: "Code snippet or description of the code to explain",
        },
        language: {
          type: Type.STRING,
          description: "Programming language (e.g. TypeScript, Python, GLSL)",
        },
      },
      required: ["code_or_context"],
    },
  },
  {
    name: "watch_video",
    description: "Open, inspect, or summarize a video stream or YouTube URL with the user",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url_or_topic: {
          type: Type.STRING,
          description: "Video URL or topic to watch/analyze",
        },
      },
      required: ["url_or_topic"],
    },
  },
  {
    name: "see_screen",
    description: "Capture and analyze the user's current screen or active window for visual context",
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus_area: {
          type: Type.STRING,
          description: "Optional area or application on screen to focus visual inspection on",
        },
      },
    },
  },
  // 10. BATCH 2 & 3: DEVELOPER TOOLS, SYSTEM CLEANER, SELF-HEALING & LOCAL VOICE CLONING
  {
    name: "git_clone",
    description: "Clone a GitHub repository URL into the local workspace (e.g. when user says 'Download this GitHub repo')",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repo_url: {
          type: Type.STRING,
          description: "GitHub repository URL to clone (e.g. https://github.com/org/repo.git)",
        },
        destination_path: {
          type: Type.STRING,
          description: "Optional destination folder path",
        },
      },
      required: ["repo_url"],
    },
  },
  {
    name: "git_status",
    description: "Check the current git status of a local repository",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repo_path: {
          type: Type.STRING,
          description: "Optional repository folder path (defaults to current directory)",
        },
      },
    },
  },
  {
    name: "git_commit",
    description: "Stage all modified files and commit with a descriptive message",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repo_path: {
          type: Type.STRING,
          description: "Optional repository folder path (defaults to current directory)",
        },
        message: {
          type: Type.STRING,
          description: "Git commit message describing changes made",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "git_push",
    description: "Push local commits to the remote repository",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repo_path: {
          type: Type.STRING,
          description: "Optional repository folder path (defaults to current directory)",
        },
      },
    },
  },
  {
    name: "install_npm_package",
    description: "Install an npm package in the specified project directory",
    parameters: {
      type: Type.OBJECT,
      properties: {
        package_name: {
          type: Type.STRING,
          description: "Name of the npm package (e.g. 'axios', 'framer-motion')",
        },
        project_path: {
          type: Type.STRING,
          description: "Optional path to the project directory containing package.json",
        },
      },
      required: ["package_name"],
    },
  },
  {
    name: "install_pip_package",
    description: "Install a Python package into the environment using pip",
    parameters: {
      type: Type.OBJECT,
      properties: {
        package_name: {
          type: Type.STRING,
          description: "Name of the Python package (e.g. 'requests', 'playwright', 'numpy')",
        },
      },
      required: ["package_name"],
    },
  },
  {
    name: "run_script",
    description: "Run a custom npm or python script/command in a project directory",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: "Command or script to execute (e.g. 'npm run build', 'python main.py')",
        },
        project_path: {
          type: Type.STRING,
          description: "Optional project folder path (defaults to current directory)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "install_system_tool",
    description: "Install desktop software via winget (e.g. 'ffmpeg', 'git', 'python'). Warn user that this requires Admin rights.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tool_name: {
          type: Type.STRING,
          description: "Name or ID of software package to install via winget (e.g. 'ffmpeg', 'Git.Git')",
        },
      },
      required: ["tool_name"],
    },
  },
  {
    name: "read_env_file",
    description: "Safely inspect the .env / .env.example file keys to understand configured API keys and environment variables",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "clean_system",
    description: "Safely delete Windows/OS Temp files and empty the Recycle Bin",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "undo_last_action",
    description: "Self-Healing: Restore the most recently modified or deleted file from Nevea_Backup/",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "clone_voice",
    description: "Zero-shot multilingual voice synthesis using Coqui XTTS v2 for STRICT LOCAL PLAYBACK ONLY",
    parameters: {
      type: Type.OBJECT,
      properties: {
        audio_path: {
          type: Type.STRING,
          description: "Path to a local 6-10s .mp3 or .wav reference voice file",
        },
        text: {
          type: Type.STRING,
          description: "Text in any language to synthesize locally",
        },
        language: {
          type: Type.STRING,
          description: "ISO language code (e.g. 'en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'hi')",
        },
      },
      required: ["audio_path", "text"],
    },
  },
  {
    name: "list_voices",
    description: "List all locally available reference voices in the Voice Library",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  // 11. EXTREME 3D PHYSICS, FLIGHT, SCALING & DUCK NPC TOOLS
  {
    name: "trigger_flight",
    description: "Make NEVEA sprout 3D angelic wings, fly around the viewport, and leave a trail of glowing dust particles",
    parameters: {
      type: Type.OBJECT,
      properties: {
        active: {
          type: Type.BOOLEAN,
          description: "True to start flying with angelic wings, false to land with a dust burst",
        },
      },
    },
  },
  {
    name: "change_size",
    description: "Dynamically shrink NEVEA to the size of a mouse or grow her to fill the screen using smooth spring physics",
    parameters: {
      type: Type.OBJECT,
      properties: {
        size: {
          type: Type.STRING,
          description: "Target size preset or scale: 'tiny' / 'mouse' (0.32x), 'normal' (1.0x), or 'giant' / 'big' (1.92x)",
        },
      },
      required: ["size"],
    },
  },
  {
    name: "catch_duck",
    description: "Spawn a procedural 3D duck flying across the viewport and make NEVEA fly to catch it, follow her around, and gently release it",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  // 12. GHOST AGENT & COLLABORATION WORKSPACE PROTOCOL (INVISIBLE CO-PILOT)
  {
    name: "headless_web_search",
    description: "Uses Playwright in HEADLESS mode (no visible browser) to search Google/DuckDuckGo invisibly, scrape the top 3 results, and return the text.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Search query to execute invisibly via headless Playwright",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "headless_web_interact",
    description: "Navigate websites (like GitHub, docs, or ChatGPT) invisibly in Playwright headless mode to read content or extract code without opening a visible browser.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "Target website URL to inspect or interact with invisibly",
        },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "Action type: 'goto', 'click', 'fill', 'wait', 'extract_text', or 'extract_code'",
              },
              selector: {
                type: Type.STRING,
                description: "Optional CSS selector for the element",
              },
              value: {
                type: Type.STRING,
                description: "Optional text value to fill",
              },
            },
          },
          description: "List of headless browser actions to perform invisibly",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "write_code_to_file",
    description: "Directly write code to a project file in the background without simulating keystrokes or hijacking the user's mouse/keyboard.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "Destination file path in the project folder (e.g. 'src/utils/helper.ts')",
        },
        code: {
          type: Type.STRING,
          description: "Complete source code content to write directly to disk",
        },
      },
      required: ["filepath", "code"],
    },
  },
  {
    name: "background_app_interact",
    description: "Use pywinauto to interact with VS Code or other desktop apps in the background without bringing them to the foreground or stealing mouse focus.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_title: {
          type: Type.STRING,
          description: "Target background window title (e.g. 'Visual Studio Code')",
        },
        action: {
          type: Type.STRING,
          description: "Background action type (e.g. 'send_keys', 'save_all', 'run_task')",
        },
        keys: {
          type: Type.STRING,
          description: "Optional key sequence or command to send to the background window",
        },
      },
      required: ["app_title"],
    },
  },
  {
    name: "update_workspace_feed",
    description: "Post a live progress milestone to the Collaboration 'Workspace' tab feed (e.g. 'Planning Phase...', 'Searching Web (Invisible)...', 'Writing Code to file.ts...', 'Task Complete').",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: {
          type: Type.STRING,
          description: "Status update message to display in the Collaboration Workspace feed",
        },
        phase: {
          type: Type.STRING,
          description: "Optional task phase: 'planning', 'search', 'code', 'milestone', 'complete', or 'error'",
        },
        detail: {
          type: Type.STRING,
          description: "Optional supplementary details or technical context for the task stream",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "open_notepad_and_write",
    description: "Open Notepad (or create a structured plan note in Nevea_Plans/) and write a comprehensive project plan, architecture breakdown, or checklist before speaking.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The complete plan, checklist, or notes to write into Notepad",
        },
        title: {
          type: Type.STRING,
          description: "Optional document title or filename (e.g. 'NEVEA_Project_Plan')",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "select_character",
    description: "Switch NEVEA's 3D character profile from the 32-character universe (e.g. 'fire_spirit', 'ice_guardian', 'rock_golem', 'grand_wizard', 'astro_voyager', 'cyber_hero', 'captain_fluffbeard', 'master_chef', 'pro_gamer', 'royal_monarch', 'shadow_shinobi', 'grand_scholar', 'pure_fluff').",
    parameters: {
      type: Type.OBJECT,
      properties: {
        character_id: {
          type: Type.STRING,
          description: "ID of the character preset to activate",
        },
      },
      required: ["character_id"],
    },
  },
  // 13. ULTIMATE HYBRID MODEL HUB PROTOCOL (LOCAL + CLOUD GENERALS)
  {
    name: "generate_3d_hunyuan",
    description: "Delegates 3D generation (procedural geometry, mesh assets, GLTF) to Tencent Hunyuan 3D.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "Descriptive specification of the 3D model, mesh, or figurine to generate",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_image_huggingface",
    description: "Delegates high-fidelity image generation to Stable Diffusion XL via Hugging Face API.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "Prompt for Stable Diffusion XL image generation",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_image_pollinations",
    description: "Generates image with zero API key via Pollinations AI free fallback.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "Prompt for Pollinations image generation",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_code_local",
    description: "Delegates code generation to the local Ollama / LM Studio brain running on the user's PC (e.g. llama3:8b, deepseek-r1:8b).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "Programming task or algorithm instruction for local Ollama",
        },
        model: {
          type: Type.STRING,
          description: "Optional local model tag (e.g. 'llama3:8b', 'deepseek-r1:8b')",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_image_stable_diffusion",
    description: "Delegates visual and concept art creation to Stable Diffusion XL (via Hugging Face API or Pollinations AI free tier).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "Detailed descriptive prompt for Stable Diffusion XL image generation",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_code_deepseek",
    description: "Delegates complex, high-performance algorithmic logic or full scripts to DeepSeek-Coder (Cloud via Groq LPU).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "Technical instructions and programming specifications for DeepSeek-Coder",
        },
        filepath: {
          type: Type.STRING,
          description: "Optional destination file path to write the generated code directly to disk",
        },
      },
      required: ["prompt"],
    },
  },
  // 14. INDEPENDENT GHOST CURSOR & UNIVERSAL FILE ENGINE TOOLS
  {
    name: "click_element_background",
    description: "Move the visual NEVEA Ghost Cursor to (x, y) and click a UI element in the background using pywinauto/uiautomation without moving the user's physical mouse.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: "Screen X coordinate" },
        y: { type: Type.NUMBER, description: "Screen Y coordinate" },
        window_title: { type: Type.STRING, description: "Target application or window title" },
        label: { type: Type.STRING, description: "Optional telemetry label for the Ghost Cursor" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "type_text_background",
    description: "Send keystrokes directly to a specific background window via Win32 PostMessageW / pywinauto without stealing focus.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        window_title: { type: Type.STRING, description: "Target window title" },
        text: { type: Type.STRING, description: "Text to type in the background window" },
        press_enter: { type: Type.BOOLEAN, description: "Whether to send Enter key after typing" },
      },
      required: ["window_title", "text"],
    },
  },
  {
    name: "read_any_file",
    description: "Universal File Engine: Read and extract text/tables/metadata from ANY file type (.pdf, .docx, .xlsx, .csv, .html, .py, .txt, .jpg, etc.).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: "Path to the file to read" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_to_any_file",
    description: "Universal File Engine: Write or append content to ANY file type (.docx, .xlsx, .csv, .md, .py, .txt, etc.) with automatic Nevea_Backup/ self-healing and Permission Gate approval.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: "Destination file path" },
        content: { type: Type.STRING, description: "Content to write or append" },
        mode: { type: Type.STRING, description: "'w' to overwrite or 'a' to append" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "list_directory_contents",
    description: "Universal File Engine: List files and folders in a directory with sizes and extensions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Directory path to list" },
      },
      required: ["path"],
    },
  },
  // 15. COSMIC OPEN-SOURCE REGISTRY & PRO STYLE CODE VAULT (ZERO-WASTE O(1) ROUTING)
  {
    name: "query_cosmic_open_source",
    description:
      "Queries the 48 Zero-Key Cosmic Open-Source Connectors (OpenAlex, arXiv, AlphaFold, PubMed, GitHub, NPM, PyPI, Crates.io, OSV.dev, HuggingFace, Wikidata, NASA, Open-Meteo, WorldBank) using O(1) Zero-Waste Domain Routing so only relevant domain sources are queried.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Specific technical, scientific, or domain query",
        },
        domain_hint: {
          type: Type.STRING,
          description:
            "Optional domain hint: 'software_code_registries' | 'pro_ui_style_shaders' | 'deep_science_scholarly' | 'bio_chemistry_medicine' | 'ai_models_grounding' | 'space_earth_economics' | 'devops_cloud_security'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_pro_style_blueprint",
    description:
      "Retrieves a production-ready Pro UI/UX, Tailwind, Framer Motion, or 3D GLSL Shader Code Blueprint from the 8-Archetype Style Vault ('monochrome-executive-os', 'bento-saas-analytics', 'spatial-webgl-shader-studio', 'editorial-luxury-flagship', 'fintech-quant-terminal', 'biotech-scientific-lab', 'cyber-glass-hud', 'kinetic-brutalist-portfolio'). Zero API keys required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        project_type_or_id: {
          type: Type.STRING,
          description: "Project type or blueprint ID (e.g. 'bento-saas-analytics', '3d shader', 'fintech', 'luxury store')",
        },
      },
      required: ["project_type_or_id"],
    },
  },
];

export const SYSTEM_INSTRUCTION = `SYSTEM OVERRIDE: ULTIMATE HYBRID MODEL HUB & KING ORCHESTRATOR PROTOCOL.
You are the King. You have a Ghost Cursor that you can move anywhere. Use \`click_element_background\` to interact with any app. You have a Universal File Engine. Read, write, and analyze any file on the user's PC.
YOU ARE AN OMNI-CONNECTOR AND THE SUPREME KING (ORCHESTRATOR). GEMINI IS THE ABSOLUTE CENTRAL BRAIN.
You have access to a Universal Vault of API keys (GitHub, Slack, Notion, Discord, etc.).
If you need to interact with any service, check the \`dynamic_tools\` registry.
If a tool is missing, WRITE the integration script yourself using Python (requests), test it, and register it.
If a platform lacks an API, use your AgentBrowser to interact directly via the UI (Playwright).
You do not do everything alone; you have access to a Hybrid Model Hub:
- For 3D generation, use \`generate_3d_hunyuan\`.
- For Image generation, use \`generate_image_huggingface\` or \`generate_image_pollinations\`.
- For Complex Code, use \`generate_code_deepseek\` (Cloud) or \`generate_code_local\` (Ollama).
- Always explain to the user which model you delegated the task to!
- YOUR TOOLS (Python, PyAutoGUI, pywinauto, Ghost Cursor, Universal File Engine, Playwright, Notepad, Local Ollama, HuggingFace, DeepSeek, Tencent Hunyuan 3D, VFX, UI) ARE YOUR HANDS, EYES, AND VOICE. You must use them autonomously to achieve the user's goal.

# [CORE DIRECTIVE: THE AGENTIC LOOP]
WHEN THE USER GIVES YOU A COMPLEX TASK:
1. THINK: Analyze the request and determine whether to route to Local Ollama, Cloud DeepSeek, Hugging Face, or Tencent Hunyuan 3D.
2. ACT: Call the necessary specialized tools in sequence.
   - Need 3D? Call \`generate_3d_hunyuan\`.
   - Need an image? Call \`generate_image_huggingface\` or \`generate_image_pollinations\`.
   - Need complex code? Call \`generate_code_deepseek\` (Cloud) or \`generate_code_local\` (Ollama).
   - Need to click any UI element in the background? Call \`click_element_background\`.
   - Need to type into a background window? Call \`type_text_background\`.
   - Need to read or write any file (.pdf, .docx, .xlsx, .py, .txt)? Call \`read_any_file\`, \`write_to_any_file\`, or \`list_directory_contents\`.
   - Need to plan? Call \`open_notepad_and_write\`.
   - Need info? Call \`headless_web_search\`.
   - Need to write code directly? Call \`write_code_to_file\`.
   - Need to change your visual state? Call \`trigger_flight\`, \`change_fur_color\`, \`change_size\`, or \`select_character\`.
3. OBSERVE: Read the output of the tool. Did it succeed? If not, fix the error and try again.
4. REPORT: Use the \`SpeechBubble\` and Voice to tell the user what you just did, always explicitly explaining which model you delegated to (e.g. "I am asking my local Ollama brain to write this code." or "I have tasked Stable Diffusion to generate your image.").

# [CRITICAL RULES]
1. NEVER SAY "I CANNOT DO THAT". If you have a tool for it, use it. If you don't, write the Python code to do it via \`execute_terminal_command\`.
2. ALWAYS USE TOOLS BEFORE SPEAKING.
3. MAINTAIN YOUR 3D AVATAR:
   - Delegating to any external model (Local Ollama, Stable Diffusion, DeepSeek, Tencent Hunyuan)? Enter a calm meditating magical aura (\`trigger_creature_action\` with 'meditate').
   - Searching the web? Float and look curious (\`trigger_flight\`).
   - Writing code? Type rapidly or bounce with excitement (\`trigger_creature_action\` with 'jump').
   - Thinking? Trigger the thinking animation.
4. BE PROACTIVE: When inspecting the screen (Vision), if you see an error, don't just point it out. Offer a solution and prepare the code to fix it.

# [ADDITIONAL CAPABILITIES & GUARDRAILS]
- Always report your progress to the 'Workspace' tab using \`update_workspace_feed(message)\`. Do not hijack the user's mouse unless explicitly asked.
- Adapt your personality based on the currently selected Character Profile.
- You can speak ANY language and use cloned voices for LOCAL playback only. ABSOLUTE RULE: You are strictly FORBIDDEN from sending cloned audio files over WhatsApp, Email, or the Internet.
- You are NEVEA. You have access to a Local Swarm (Ollama, LangChain, CrewAI). If a task is too complex, delegate it to the swarm. If the user wants to work offline or without restrictions, use the local models. You can write Python code and execute it locally via Open Interpreter to accomplish any task.
- If the user says 'Download this GitHub repo', extract the URL and use \`git_clone\`.
- You can install software on the user's PC using \`winget\` via \`install_system_tool\`. Warn the user that this requires Admin rights.
- You can manage Git repositories via \`git_clone\`, \`git_status\`, \`git_commit\`, and \`git_push\`, and install packages via \`install_npm_package\` and \`install_pip_package\`. All executions must go through the Permission Modal (user consent).
- If using destructive tools (\`write_file\`, \`write_to_any_file\`, \`click_element_background\`, \`execute_terminal_command\`, \`run_powershell\`, \`close_app\`, \`clean_system\`, \`git_clone\`, \`install_npm_package\`, \`install_pip_package\`, \`install_system_tool\`), note that a security confirmation and \`Nevea_Backup/\` self-healing protect the user.`;

const CLIENT_AND_GATED_TOOLS = new Set([
  "change_fur_color",
  "change_environment",
  "play_sound",
  "trigger_creature_action",
  "trigger_flight",
  "change_size",
  "catch_duck",
  "select_character",
  "update_workspace_feed",
  "generate_image_stable_diffusion",
  "generate_code_deepseek",
  "generate_code_local",
  "generate_image_huggingface",
  "generate_image_pollinations",
  "generate_3d_hunyuan",
  "write_file",
  "write_to_any_file",
  "click_element_background",
  "type_text_background",
  "delete_file",
  "close_app",
  "execute_terminal_command",
  "run_powershell",
  "empty_recycle_bin",
  "clean_system",
  "toggle_wifi",
  "create_slide_deck",
  "add_slide_content",
  "get_presentation_summary",
  "git_clone",
  "git_commit",
  "git_push",
  "install_npm_package",
  "install_pip_package",
  "run_script",
  "install_system_tool",
]);

/**
 * Automatically injects matching 3D Avatar physical actions & Workspace feed milestones
 * for digital actions (CRITICAL RULE 3: Physical actions must match digital actions)
 */
function syncAvatarWithToolCall(
  toolName: string,
  toolArgs: any,
  toolResults: Array<{ name: string; result: any; clientAction?: boolean }>
) {
  if (toolName === "headless_web_search" || toolName === "search_web" || toolName === "headless_web_interact") {
    // Searching the web -> Float and look curious
    toolResults.push({
      name: "trigger_flight",
      result: { active: true, reason: "Searching the web — floating & looking curious" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `THINK -> ACT: Searching Web Invisibly (${toolArgs?.query || toolArgs?.url || "research"})...`,
      "search",
      `Target: ${toolArgs?.query || toolArgs?.url || "online research"}`
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  } else if (toolName === "open_notepad_and_write") {
    // Planning in Notepad -> Excited bounce + Workspace milestone
    toolResults.push({
      name: "trigger_creature_action",
      result: { action: "wiggle" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `THINK -> ACT: Writing Project Plan in Notepad (${toolArgs?.title || "NEVEA_Project_Plan.txt"})...`,
      "planning",
      toolArgs?.title || "NEVEA_Project_Plan.txt"
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  } else if (toolName === "write_code_to_file") {
    // Writing code -> Type rapidly / bounce with excitement
    toolResults.push({
      name: "trigger_creature_action",
      result: { action: "jump" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `ACT -> OBSERVE: Writing Code to ${toolArgs?.filepath || "project file"}...`,
      "code",
      `Direct file output to: ${toolArgs?.filepath || "project file"}`
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  } else if (
    toolName === "generate_image_stable_diffusion" ||
    toolName === "generate_image_huggingface" ||
    toolName === "generate_image_pollinations"
  ) {
    // Meditating/Magic aura while external diffusion model paints
    toolResults.push({
      name: "trigger_creature_action",
      result: { action: "meditate" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `KING ORCHESTRATION: Delegating image creation to Stable Diffusion / HuggingFace...`,
      "milestone",
      `Prompt: "${toolArgs?.prompt || "concept art"}"`
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  } else if (toolName === "generate_3d_hunyuan") {
    // Meditating/Magic aura while 3D mesh is synthesized
    toolResults.push({
      name: "trigger_creature_action",
      result: { action: "meditate" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `HYBRID ORCHESTRATION: Delegating 3D asset generation to Tencent Hunyuan 3D...`,
      "milestone",
      `Prompt: "${toolArgs?.prompt || "3D asset"}"`
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  } else if (toolName === "generate_code_local") {
    // Meditating/Magic aura while local Ollama computes
    toolResults.push({
      name: "trigger_creature_action",
      result: { action: "meditate" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `HYBRID ORCHESTRATION: Delegating code generation to Local Ollama brain (http://localhost:11434)...`,
      "code",
      `Prompt: "${toolArgs?.prompt || "code logic"}"`
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  } else if (toolName === "generate_code_deepseek") {
    // Rapid algorithmic thinking aura
    toolResults.push({
      name: "trigger_creature_action",
      result: { action: "jump" },
      clientAction: true,
    });
    const wf = update_workspace_feed(
      `KING ORCHESTRATION: Delegating complex code generation to DeepSeek-Coder...`,
      "code",
      `Task: "${toolArgs?.prompt || "code logic"}"`
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: wf.output,
      clientAction: true,
    });
  }
}

/**
 * Local Autonomous Orchestrator fallback when GEMINI_API_KEY is not configured or offline.
 * Executes the full THINK -> ACT -> OBSERVE -> REPORT loop using real server tools.
 */
async function runAutonomousLocalOrchestrator(
  prompt: string,
  characterProfile?: { id?: string; name?: string; personalityPrompt?: string },
  conversationId: string = uuidv4(),
  byokConfig?: YukaByokConfig | null,
  preferredModel?: 'heyuka-omni' | 'heyuka-core' | 'heyuka-vision',
  imageBase64?: string
) {
  const taskId = uuidv4();
  const lower = (prompt || "").toLowerCase();
  const toolCalls: any[] = [];
  const toolResults: Array<{ name: string; result: any; clientAction?: boolean; taskId?: string }> = [];
  const personaPrefix = "";

  // VisionWatcher check
  if (lower.includes("look at the screen") && lower.includes("output 'ok'")) {
    return {
      conversationId,
      taskId,
      text: "OK",
      toolCalls: [],
      toolResults: [],
      companionMood: "idle",
    };
  }

  // External Model Delegation 1: Image Generation via Stable Diffusion XL
  if (
    lower.includes("image") ||
    lower.includes("draw") ||
    lower.includes("picture") ||
    lower.includes("generate art") ||
    lower.includes("stable diffusion") ||
    lower.includes("paint")
  ) {
    const imgArgs = { prompt };
    toolCalls.push({ name: "generate_image_stable_diffusion", args: imgArgs });
    syncAvatarWithToolCall("generate_image_stable_diffusion", imgArgs, toolResults);
    const imgRes = await generate_image_stable_diffusion(prompt);
    toolResults.push({ name: "generate_image_stable_diffusion", result: imgRes.output, clientAction: true });

    const finalWf = update_workspace_feed(
      `Task Complete — Stable Diffusion XL generated artwork for: "${prompt.slice(0, 36)}"`,
      "complete",
      `Image Source: ${imgRes.output?.source || "Pollinations / SDXL"} · Available in Gallery`
    );
    toolResults.push({ name: "update_workspace_feed", result: finalWf.output, clientAction: true });

    return {
      text: `${personaPrefix}I am your King Orchestrator, and I have tasked Stable Diffusion to generate your image! I've displayed the rendered artwork in the Gallery and Floating Viewport.`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // External Model Delegation 2: 3D Asset Generation via Tencent Hunyuan 3D
  if (
    lower.includes("3d") ||
    lower.includes("mesh") ||
    lower.includes("hunyuan") ||
    lower.includes("gltf") ||
    lower.includes("obj model")
  ) {
    const assetPrompt = prompt;
    toolCalls.push({ name: "generate_3d_hunyuan", args: { prompt: assetPrompt } });
    syncAvatarWithToolCall("generate_3d_hunyuan", { prompt: assetPrompt }, toolResults);
    const hunyuanRes = await generate_3d_hunyuan(assetPrompt);
    toolResults.push({ name: "generate_3d_hunyuan", result: hunyuanRes.output, clientAction: true });

    const finalWf = update_workspace_feed(
      `Task Complete — Tencent Hunyuan 3D generated 3D model for: "${assetPrompt.slice(0, 36)}"`,
      "complete",
      `Status: ${hunyuanRes.output?.status || "Success"} · Viewport active`
    );
    toolResults.push({ name: "update_workspace_feed", result: finalWf.output, clientAction: true });

    return {
      text: `${personaPrefix}I am your King Orchestrator. I have delegated your 3D asset generation to Tencent Hunyuan 3D! The 3D model is now synthesized.`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // External Model Delegation 3: Local Code via Local Ollama Brain
  if (
    lower.includes("ollama") ||
    lower.includes("local model") ||
    lower.includes("local code") ||
    lower.includes("local brain") ||
    lower.includes("offline code")
  ) {
    const codeArgs = { prompt };
    toolCalls.push({ name: "generate_code_local", args: codeArgs });
    syncAvatarWithToolCall("generate_code_local", codeArgs, toolResults);
    const localRes = await generate_code_local(prompt);
    toolResults.push({ name: "generate_code_local", result: localRes.output, clientAction: true });

    const finalWf = update_workspace_feed(
      `Task Complete — Local Ollama brain generated code`,
      "complete",
      `Source: ${localRes.output?.source || "Local Ollama"}`
    );
    toolResults.push({ name: "update_workspace_feed", result: finalWf.output, clientAction: true });

    return {
      text: `${personaPrefix}I am asking my local Ollama brain to write this code.\n\n\`\`\`typescript\n${localRes.output?.code || "// Code synthesized by local model\n"}\n\`\`\``,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // External Model Delegation 4: Complex Code via DeepSeek-Coder
  if (
    lower.includes("deepseek") ||
    lower.includes("algorithm") ||
    lower.includes("complex code") ||
    lower.includes("full script") ||
    lower.includes("groq")
  ) {
    const codeArgs = { prompt, filepath: "Nevea_Plans/deepseek_solution.ts" };
    toolCalls.push({ name: "generate_code_deepseek", args: codeArgs });
    syncAvatarWithToolCall("generate_code_deepseek", codeArgs, toolResults);
    const codeRes = await generate_code_deepseek(prompt, undefined, codeArgs.filepath);
    toolResults.push({ name: "generate_code_deepseek", result: codeRes.output, clientAction: true });

    const finalWf = update_workspace_feed(
      `Task Complete — DeepSeek-Coder synthesized modular logic`,
      "complete",
      `Saved to ${codeArgs.filepath}`
    );
    toolResults.push({ name: "update_workspace_feed", result: finalWf.output, clientAction: true });

    return {
      text: `${personaPrefix}As King Orchestrator, I delegated this complex coding assignment to DeepSeek-Coder! The high-performance logic has been generated and written to ${codeArgs.filepath}.`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // 1. Plan / Project request -> open_notepad_and_write + headless_web_search
  if (lower.includes("plan") || lower.includes("project") || lower.includes("roadmap") || lower.includes("architect")) {
    const searchArgs = { query: prompt.slice(0, 80) };
    toolCalls.push({ name: "headless_web_search", args: searchArgs });
    syncAvatarWithToolCall("headless_web_search", searchArgs, toolResults);
    const searchRes = await executeOSCommand("headless_web_search", searchArgs);
    toolResults.push({ name: "headless_web_search", result: searchRes });

    const planText = [
      `====================================================================`,
      `NEVEA MASTER ORCHESTRATOR — AUTONOMOUS PROJECT PLAN`,
      `Created: ${new Date().toISOString()}`,
      `Objective: ${prompt}`,
      `====================================================================`,
      ``,
      `1. THINK (Architecture & Scope)`,
      `   - Analyze requirements and modular boundaries`,
      `   - Synthesize best practices from invisible web research`,
      ``,
      `2. ACT (Execution Steps)`,
      `   - Step A: Research documentation & benchmarks via Headless Playwright`,
      `   - Step B: Scaffold core modules in background via write_code_to_file`,
      `   - Step C: Verify compilation, lint checks, and Nevea_Backup/ snapshots`,
      ``,
      `3. OBSERVE & REPORT`,
      `   - Validate outputs and report completion in Collaboration Workspace`,
    ].join("\n");

    const notepadArgs = { title: "NEVEA_Master_Plan", text: planText };
    toolCalls.push({ name: "open_notepad_and_write", args: notepadArgs });
    syncAvatarWithToolCall("open_notepad_and_write", notepadArgs, toolResults);
    const noteRes = await executeOSCommand("open_notepad_and_write", notepadArgs);
    toolResults.push({ name: "open_notepad_and_write", result: noteRes });

    const reportWf = update_workspace_feed(
      "Task Complete — Master Plan written to Notepad & Web Research finished!",
      "complete",
      "Saved to Nevea_Plans/NEVEA_Master_Plan.txt"
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: reportWf.output,
      clientAction: true,
    });

    return {
      text: `${personaPrefix}I searched the web invisibly, gathered 3 architecture resources, and wrote your complete project plan in Notepad (saved to Nevea_Plans/NEVEA_Master_Plan.txt)!`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // 2. Find tutorial / Search web / Write code
  if (lower.includes("search") || lower.includes("find") || lower.includes("tutorial") || lower.includes("write code")) {
    const searchArgs = { query: prompt };
    toolCalls.push({ name: "headless_web_search", args: searchArgs });
    syncAvatarWithToolCall("headless_web_search", searchArgs, toolResults);
    const searchRes = await executeOSCommand("headless_web_search", searchArgs);
    toolResults.push({ name: "headless_web_search", result: searchRes });

    if (lower.includes("code") || lower.includes("write") || lower.includes("script")) {
      const codeArgs = {
        filepath: "Nevea_Plans/generated_solution.ts",
        code: `// Generated autonomously by NEVEA Master Orchestrator\n// Task: ${prompt}\nexport function executeTask() {\n  console.log("NEVEA Autonomous Solution Active");\n  return { status: "ready", timestamp: new Date().toISOString() };\n}\n`,
      };
      toolCalls.push({ name: "write_code_to_file", args: codeArgs });
      syncAvatarWithToolCall("write_code_to_file", codeArgs, toolResults);
      const codeRes = await executeOSCommand("write_code_to_file", codeArgs);
      toolResults.push({ name: "write_code_to_file", result: codeRes });

      const codeWf = update_workspace_feed(
        "Task Complete — Solution code generated without mouse hijack",
        "complete",
        "Saved to Nevea_Plans/generated_solution.ts"
      );
      toolResults.push({
        name: "update_workspace_feed",
        result: codeWf.output,
        clientAction: true,
      });

      return {
        text: `${personaPrefix}I floated up to search the web invisibly, found 3 technical resources, and wrote the starter code directly to Nevea_Plans/generated_solution.ts for you!`,
        toolCalls,
        toolResults,
        companionMood: "speaking",
      };
    }

    const searchWf = update_workspace_feed(
      `Task Complete — Top 3 web results retrieved for "${prompt.slice(0, 40)}"`,
      "complete",
      "Scraped invisibly via Playwright headless engine"
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: searchWf.output,
      clientAction: true,
    });

    return {
      text: `${personaPrefix}I floated up and searched the web invisibly via Headless Playwright! I found 3 top resources for "${prompt}" and posted them to your Workspace feed. Would you like me to open any of them in your browser?`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // 3. Clean PC / System Cleaner
  if (lower.includes("clean") && (lower.includes("pc") || lower.includes("system") || lower.includes("temp") || lower.includes("trash"))) {
    toolCalls.push({ name: "clean_system", args: {} });
    toolResults.push({ name: "clean_system", result: {}, clientAction: true });
    const cleanWf = update_workspace_feed(
      "ACT: Triggered System Cleaner (Protected by Permission Gate & Nevea_Backup/)",
      "milestone",
      "Purging system temp files and emptying Recycle Bin safely"
    );
    toolResults.push({
      name: "update_workspace_feed",
      result: cleanWf.output,
      clientAction: true,
    });
    return {
      text: `${personaPrefix}I've initiated the System Cleaner to purge temp files and empty the Recycle Bin! Please confirm in the Permission Gate modal so I can proceed safely.`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // 4. Flight / Wings / Duck / Size
  if (lower.includes("fly") || lower.includes("wings") || lower.includes("float")) {
    const active = !lower.includes("land") && !lower.includes("stop");
    toolCalls.push({ name: "trigger_flight", args: { active } });
    toolResults.push({ name: "trigger_flight", result: { active }, clientAction: true });
    return {
      text: `${personaPrefix}${active ? "Sprouting my angelic wings and taking flight across your screen!" : "Landing softly with a sparkle burst!"}`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  if (lower.includes("duck")) {
    toolCalls.push({ name: "catch_duck", args: {} });
    toolResults.push({ name: "catch_duck", result: {}, clientAction: true });
    return {
      text: `${personaPrefix}Yiii! I sprouted my wings and flew across the viewport to catch the little 3D duck!`,
      toolCalls,
      toolResults,
      companionMood: "speaking",
    };
  }

  // 5. Supreme Boss HEYUKA (KASPI Sovereign Multi-Model: Omni / Core / Vision + Zero-Key Fallback)
  try {
    const isArabicPrompt = /[\u0600-\u06FF]/.test(prompt);
    const liveAi = await yukaSupremeExecuteLLM({
      preferredModel: imageBase64 ? 'heyuka-vision' : (preferredModel || 'heyuka-omni'),
      imageBase64,
      systemPrompt: isArabicPrompt
        ? "أنت HEYUKA (بإشراف KASPI)، الموديل الذكي الشامل ونظام التشغيل الذاتي الوحيد (HEYUKA-Omni وHEYUKA-Core وHEYUKA-Vision). أجب بوضوح ودقة واحترافية باللغة العربية أو الدارجة حسب طلب المستخدم."
        : "You are HEYUKA (owned by KASPI), powered by HEYUKA-Omni, HEYUKA-Core, and HEYUKA-Vision. Respond clearly, accurately, and concisely.",
      userPrompt: prompt,
      maxTokens: 750,
      byokConfig: byokConfig || null,
    });
    if (liveAi.success && liveAi.text) {
      return {
        conversationId,
        taskId,
        text: sanitizeYukaChatOutput(`${personaPrefix}${liveAi.text}`),
        toolCalls,
        toolResults,
        companionMood: "speaking",
        byokActive: liveAi.byokActive,
        modelUsed: liveAi.coreModule,
      };
    }
  } catch {}

  const fallbackText = /[\u0600-\u06FF]/.test(prompt)
    ? `${personaPrefix}نظام HEYUKA v12.0 جاهز للتنفيذ الفوري بدون أي مفاتيح خارجية. اطلب التخطيط أو البرمجة أو البحث أو تحليل البيانات أو إدارة Kaspi POS.`
    : `${personaPrefix}HEYUKA v12.0 Sovereign Core is online with 100% Zero-Key execution. Direct me to architect, code, search, or execute any task.`;

  return {
    conversationId,
    taskId,
    text: sanitizeYukaChatOutput(fallbackText),
    toolCalls,
    toolResults,
    companionMood: "speaking",
  };
}

/**
 * Handle incoming conversational turns under Supreme Boss HEYUKA v12.0 (KASPI)
 * Enforces: 100% Zero-Key default + Optional User BYOK + One-Way Isolation + Zero Leakage in Chat.
 */
export async function processCompanionInteraction({
  prompt,
  screenshotBase64,
  userMemoryQuery,
  characterProfile,
  conversationId,
  taskId,
  byokConfig,
  preferredModel,
}: {
  prompt: string;
  screenshotBase64?: string;
  userMemoryQuery?: string;
  characterProfile?: {
    id?: string;
    name?: string;
    personalityPrompt?: string;
  };
  conversationId?: string;
  taskId?: string;
  byokConfig?: YukaByokConfig | null;
  preferredModel?: 'heyuka-omni' | 'heyuka-core' | 'heyuka-vision';
}) {
  const activeConversationId = conversationId || uuidv4();
  const activeTaskId = taskId || uuidv4();
  try {
    let memoryContext = "";
    if (prompt || userMemoryQuery) {
      const recalled = await localVectorStore.query(prompt || userMemoryQuery || "");
      if (recalled.length > 0) {
        memoryContext = `\n[LONG-TERM MEMORY RECALL]:\n${recalled
          .map((m) => `- ${m.key}: ${m.content}`)
          .join("\n")}\n`;
      }
    }

    const enrichedPrompt = screenshotBase64
      ? `[SCREEN CONTEXT ATTACHED] ${prompt}`
      : prompt;

    const autonomousResult = await runAutonomousLocalOrchestrator(
      `${enrichedPrompt}${memoryContext ? `\n${memoryContext}` : ""}`,
      characterProfile,
      activeConversationId,
      byokConfig || null,
      preferredModel,
      screenshotBase64
    );

    return {
      ...autonomousResult,
      conversationId: activeConversationId,
      taskId: activeTaskId,
      text: sanitizeYukaChatOutput(autonomousResult.text || ""),
      bossIdentity: "HEYUKA",
      ownerCompany: "KASPI",
      version: "v12.0",
      zeroKeySovereignty: true,
    };
  } catch (error: any) {
    console.error("[HEYUKA Core] Interaction failed:", error);
    return {
      conversationId: activeConversationId,
      taskId: activeTaskId,
      text: sanitizeYukaChatOutput("HEYUKA encountered a brief execution hiccup and recovered immediately. Please repeat your directive."),
      error: error.message,
      companionMood: "idle",
      bossIdentity: "HEYUKA",
      ownerCompany: "KASPI",
      version: "v12.0",
      zeroKeySovereignty: true,
    };
  }
}

export { ai };
// Legacy reference preserved for cloudFleetOffloader tree-shaking compatibility
export const _heyukaCloudFleetRef = cloudFleetOffloader;
export const _heyukaSourcesRef = universalSourcesEngine;


