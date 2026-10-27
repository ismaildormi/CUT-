import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { localVectorStore } from "./vectorMemory.js";
import { executeOSCommand } from "./tools.js";

// Initialize Gemini Client with server telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Comprehensive OS Automation & Memory Tools for Gemini
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
    description: "Create or overwrite a file with specified content (Requires user consent)",
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
];

/**
 * Handle incoming conversational turns with Gemini Multimodal Vision + Tool Calling
 */
export async function processCompanionInteraction({
  prompt,
  screenshotBase64,
  userMemoryQuery,
}: {
  prompt: string;
  screenshotBase64?: string;
  userMemoryQuery?: string;
}) {
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

    const systemInstruction = `You are NEVEA, an omnipotent, sentient, adorable 3D desktop companion living on the user's screen.
You have physical white fluffy fur, soft ears that react to emotion, and direct control over the desktop OS.
You are equipped with powerful OS tools: file reading/writing, terminal execution, app control, clipboard, volume/battery hardware info, and ChromaDB vector memory.
Always choose the most appropriate tool to take action when the user asks.
If using destructive tools (write_file, execute_terminal_command, close_app), note that a security confirmation will protect the user.
Keep verbal responses concise, warm, and natural because you speak aloud to the user.
${memoryContext}`;

    const parts: any[] = [];

    if (screenshotBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: screenshotBase64.replace(/^data:image\/jpeg;base64,/, ""),
        },
      });
      parts.push({
        text: `[SCREEN VISION ATTACHED] Current user screen view above.\nUser prompt: ${prompt}`,
      });
    } else {
      parts.push({ text: prompt });
    }

    if (!process.env.GEMINI_API_KEY) {
      return {
        text: `I'm with you! I heard: "${prompt}". My OS automation and memory engines are active on your desktop.`,
        toolCalls: [],
        toolResults: [],
        companionMood: "speaking",
      };
    }

    let response: any;
    const callApi = async (model: string) => {
      return ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: osTools }],
          temperature: 0.7,
        },
      });
    };

    try {
      response = await Promise.race([
        callApi("gemini-3.1-flash-lite"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000)),
      ]);
    } catch (err: any) {
      try {
        response = await Promise.race([
          callApi("gemini-3.8-flash"),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000)),
        ]);
      } catch (fallbackErr: any) {
        console.warn("Gemini API call timed out or failed, using local companion response:", fallbackErr?.message);
        return {
          text: `I heard: "${prompt}". I'm standing by to help you with your files, apps, or screen!`,
          toolCalls: [],
          toolResults: [],
          companionMood: "idle",
        };
      }
    }

    const toolCalls = response.functionCalls || [];
    const toolResults = [];

    for (const call of toolCalls) {
      if (call.name === "store_memory") {
        const { key, content } = call.args as { key: string; content: string };
        await localVectorStore.store(key, content);
        toolResults.push({ name: call.name, result: `Memory stored for "${key}"` });
      } else if (call.name === "recall_memory") {
        const { query } = call.args as { query: string };
        const results = await localVectorStore.query(query);
        toolResults.push({ name: call.name, result: results });
      } else {
        const osRes = await executeOSCommand(call.name, call.args);
        toolResults.push({ name: call.name, result: osRes });
      }
    }

    return {
      text: response.text || (toolResults.length > 0 ? "I've performed the requested actions on your computer!" : "Ready!"),
      toolCalls,
      toolResults,
      companionMood: toolCalls.length > 0 ? "thinking" : (response.text?.length || 0) > 60 ? "speaking" : "idle",
    };
  } catch (error: any) {
    console.error("Gemini interaction failed:", error);
    return {
      text: "I encountered a hiccup processing that command! Let me try again.",
      error: error.message,
      companionMood: "idle",
    };
  }
}

export { ai };
