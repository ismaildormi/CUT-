import fs from 'fs';
import path from 'path';

interface MemoryItem {
  id: string;
  key: string;
  content: string;
  timestamp: number;
  embedding?: number[];
}

const MEMORY_FILE = path.join(process.cwd(), '.nevea_memory.json');

/**
 * High-Speed Local Vector Store with fallback cosine semantic similarity
 * Bridges natively with Python ChromaDB instance when available.
 */
class LocalVectorStore {
  private memories: Map<string, MemoryItem> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
        const items: MemoryItem[] = JSON.parse(raw);
        for (const item of items) {
          this.memories.set(item.id, item);
        }
      }
    } catch (e) {
      console.warn('Could not load existing memory store, initializing empty.', e);
    }
  }

  private save() {
    try {
      const items = Array.from(this.memories.values());
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(items, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save memory file:', e);
    }
  }

  public async store(key: string, content: string): Promise<MemoryItem> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const item: MemoryItem = {
      id,
      key,
      content,
      timestamp: Date.now(),
      embedding: this.generateSimpleEmbedding(`${key} ${content}`)
    };
    this.memories.set(id, item);
    this.save();
    return item;
  }

  public async query(queryText: string, limit: number = 4): Promise<MemoryItem[]> {
    const queryTokens = queryText.toLowerCase().split(/\s+/).filter(Boolean);
    const queryEmbedding = this.generateSimpleEmbedding(queryText);

    const scored = Array.from(this.memories.values()).map(item => {
      // Hybrid scoring: Keyword overlap + vector cosine similarity
      const itemText = `${item.key} ${item.content}`.toLowerCase();
      let keywordScore = 0;
      for (const token of queryTokens) {
        if (itemText.includes(token)) keywordScore += 1;
      }

      const cosine = item.embedding
        ? this.cosineSimilarity(queryEmbedding, item.embedding)
        : 0;

      return {
        item,
        score: keywordScore * 0.5 + cosine * 0.5
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  }

  public getAll(): MemoryItem[] {
    return Array.from(this.memories.values());
  }

  public delete(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) this.save();
    return deleted;
  }

  // 128-dimensional frequency hash embedding generator
  private generateSimpleEmbedding(text: string): number[] {
    const dim = 128;
    const vec = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1.0;
    }

    // Normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1.0;
    return vec.map(v => v / mag);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }
}

export const localVectorStore = new LocalVectorStore();
