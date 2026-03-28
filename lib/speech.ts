/**
 * Speech utilities — browser TTS and recognition.
 * 
 * TTS and STT are detected and exposed SEPARATELY.
 * The app should never gate the whole experience on both being present.
 */

// ─── Feature detection ──────────────────────────────────

export function hasSpeechSynthesis(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export function hasSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

/**
 * Returns a human-readable capability summary for the current browser.
 */
export function getCapabilityMessage(): {
  canListen: boolean;
  canSpeak: boolean;
  message: string;
  mode: 'full' | 'listen-only' | 'read-only';
} {
  const canSpeak = hasSpeechSynthesis();
  const canListen = hasSpeechRecognition();

  if (canSpeak && canListen) {
    return {
      canListen: true,
      canSpeak: true,
      message: '',
      mode: 'full',
    };
  }

  if (canSpeak && !canListen) {
    return {
      canListen: false,
      canSpeak: true,
      message: 'Speech recognition is not available in this browser. You can still listen and shadow along — the app just can\'t check what you said.',
      mode: 'listen-only',
    };
  }

  if (!canSpeak && canListen) {
    return {
      canListen: true,
      canSpeak: false,
      message: 'Text-to-speech is not available in this browser. You can read the phrases and record yourself, but audio playback won\'t work.',
      mode: 'full', // STT still works, just no auto-play
    };
  }

  return {
    canListen: false,
    canSpeak: false,
    message: 'This browser supports neither speech synthesis nor recognition. You can still read the phrases and practice silently.',
    mode: 'read-only',
  };
}


// ─── Text-to-Speech ─────────────────────────────────────

export function speak(text: string, lang: string = 'de-DE', rate: number = 0.85): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!hasSpeechSynthesis()) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = 1.0;

    // Try to find a German voice
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(v => v.lang.startsWith('de') && v.localService) ||
                        voices.find(v => v.lang.startsWith('de'));
    if (germanVoice) utterance.voice = germanVoice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
  });
}

// ─── Speech Recognition ─────────────────────────────────

export interface RecognitionResult {
  transcript: string;
  confidence: number;
}

export function listen(lang: string = 'de-DE', timeoutMs: number = 8000): Promise<RecognitionResult> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition ||
                              (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    const timeout = setTimeout(() => {
      recognition.stop();
      reject(new Error('timeout'));
    }, timeoutMs);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      clearTimeout(timeout);
      const result = event.results[0][0];
      resolve({
        transcript: result.transcript,
        confidence: result.confidence,
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      clearTimeout(timeout);
      reject(new Error(event.error));
    };

    recognition.onend = () => {
      clearTimeout(timeout);
    };

    recognition.start();
  });
}

// ─── Transcript Comparison ──────────────────────────────
//
// This compares WORDS IN SEQUENCE, not pronunciation.
// It uses longest-common-subsequence to measure how much of the
// original phrase was captured in order. This is more defensible
// than bag-of-words but still only measures what the browser's
// speech-to-text engine returned — NOT how you sounded.

function normalize(s: string): string[] {
  return s.toLowerCase()
    .replace(/[.,!?;:'"„"–—\-]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

/**
 * Longest common subsequence length between two word arrays.
 * Respects word order — "ich bin müde" vs "müde bin ich" scores lower
 * than a bag-of-words approach would.
 */
function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Space-optimized LCS
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[n];
}

export function compareTranscripts(original: string, attempt: string): {
  similarity: number;
  matchedWords: number;
  totalWords: number;
  feedback: string;
} {
  const origWords = normalize(original);
  const attemptWords = normalize(attempt);

  if (origWords.length === 0) {
    return { similarity: 0, matchedWords: 0, totalWords: 0, feedback: '' };
  }

  const matched = lcsLength(origWords, attemptWords);
  const similarity = matched / origWords.length;

  let feedback: string;
  if (similarity >= 0.9) {
    feedback = 'Sehr nah dran. Fast jedes Wort erfasst.';
  } else if (similarity >= 0.7) {
    feedback = 'Gut. Die meisten Wörter stimmen.';
  } else if (similarity >= 0.5) {
    feedback = 'Auf dem Weg. Hör noch einmal genau hin.';
  } else if (similarity > 0) {
    feedback = 'Ein Anfang. Versuch es langsamer.';
  } else {
    feedback = 'Noch einmal. Hör genau hin.';
  }

  return { similarity, matchedWords: matched, totalWords: origWords.length, feedback };
}
