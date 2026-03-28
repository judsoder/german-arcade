/**
 * localStorage-backed session memory for Schattensprache.
 * 
 * Tracks: sessions played, best streak, recent phrases,
 * low-match phrases (for resurfacing), and saved Merkwörter.
 */

const STORE_KEY = 'schattensprache_v1';

export interface SavedWord {
  word: string;
  note: string;
  phraseGerman: string;
  savedAt: number; // timestamp
}

export interface PhraseRecord {
  phraseId: string;
  lastSeen: number;
  attempts: number;
  bestSimilarity: number;
  lastSimilarity: number;
}

export interface StoreData {
  sessionsPlayed: number;
  bestStreak: number;
  totalRoundsPlayed: number;
  phraseHistory: Record<string, PhraseRecord>;
  savedWords: SavedWord[];
  lastSessionAt: number | null;
}

const DEFAULT_STORE: StoreData = {
  sessionsPlayed: 0,
  bestStreak: 0,
  totalRoundsPlayed: 0,
  phraseHistory: {},
  savedWords: [],
  lastSessionAt: null,
};

function read(): StoreData {
  if (typeof window === 'undefined') return { ...DEFAULT_STORE };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_STORE };
    return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function write(data: StoreData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — degrade silently
  }
}

// ─── Public API ──────────────────────────────────────────

export function getStore(): StoreData {
  return read();
}

export function recordSession(
  results: Array<{
    phraseId: string;
    similarity: number;
    skipped: boolean;
  }>,
  bestStreak: number,
): void {
  const store = read();
  store.sessionsPlayed += 1;
  store.lastSessionAt = Date.now();
  store.bestStreak = Math.max(store.bestStreak, bestStreak);

  for (const r of results) {
    store.totalRoundsPlayed += 1;
    const existing = store.phraseHistory[r.phraseId];
    if (existing) {
      existing.lastSeen = Date.now();
      existing.attempts += 1;
      existing.lastSimilarity = r.similarity;
      existing.bestSimilarity = Math.max(existing.bestSimilarity, r.similarity);
    } else {
      store.phraseHistory[r.phraseId] = {
        phraseId: r.phraseId,
        lastSeen: Date.now(),
        attempts: 1,
        bestSimilarity: r.similarity,
        lastSimilarity: r.similarity,
      };
    }
  }

  write(store);
}

/**
 * Returns phrase IDs that the user has struggled with (best < 0.6),
 * sorted by worst performance first.
 */
export function getWeakPhraseIds(limit: number = 3): string[] {
  const store = read();
  return Object.values(store.phraseHistory)
    .filter(p => p.bestSimilarity < 0.6 && p.attempts > 0)
    .sort((a, b) => a.bestSimilarity - b.bestSimilarity)
    .slice(0, limit)
    .map(p => p.phraseId);
}

export function saveWord(word: string, note: string, phraseGerman: string): void {
  const store = read();
  // Avoid duplicates
  const exists = store.savedWords.some(w => w.word === word && w.phraseGerman === phraseGerman);
  if (!exists) {
    store.savedWords.push({
      word,
      note,
      phraseGerman,
      savedAt: Date.now(),
    });
    write(store);
  }
}

export function removeSavedWord(word: string, phraseGerman: string): void {
  const store = read();
  store.savedWords = store.savedWords.filter(
    w => !(w.word === word && w.phraseGerman === phraseGerman)
  );
  write(store);
}

export function getSavedWords(): SavedWord[] {
  return read().savedWords;
}

export function isWordSaved(word: string, phraseGerman: string): boolean {
  return read().savedWords.some(w => w.word === word && w.phraseGerman === phraseGerman);
}
