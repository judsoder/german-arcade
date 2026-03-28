/**
 * Speech utilities — browser TTS and recognition.
 */

// ─── Text-to-Speech ─────────────────────────────────────

export function speak(text: string, lang: string = 'de-DE', rate: number = 0.85): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
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

// ─── Comparison ─────────────────────────────────────────

export function compareTranscripts(original: string, attempt: string): {
  similarity: number;
  matchedWords: number;
  totalWords: number;
  feedback: string;
} {
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[.,!?;:'"„"–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const origWords = normalize(original).split(' ');
  const attemptWords = normalize(attempt).split(' ');

  let matched = 0;
  for (const word of origWords) {
    if (attemptWords.includes(word)) matched++;
  }

  const similarity = origWords.length > 0 ? matched / origWords.length : 0;

  let feedback: string;
  if (similarity >= 0.9) {
    feedback = 'Sehr gut. Fast perfekt.';
  } else if (similarity >= 0.7) {
    feedback = 'Gut. Die meisten Wörter stimmen.';
  } else if (similarity >= 0.5) {
    feedback = 'Auf dem richtigen Weg. Hör noch einmal zu.';
  } else if (similarity > 0) {
    feedback = 'Ein Anfang. Versuch es langsamer.';
  } else {
    feedback = 'Noch einmal. Hör genau hin.';
  }

  return { similarity, matchedWords: matched, totalWords: origWords.length, feedback };
}

// ─── Feature detection ──────────────────────────────────

export function hasSpeechRecognition(): boolean {
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

export function hasSpeechSynthesis(): boolean {
  return 'speechSynthesis' in window;
}
