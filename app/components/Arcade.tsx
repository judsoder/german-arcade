'use client';

import { useState, useCallback, useEffect } from 'react';
import { Category, Phrase, getPhrasesForSession, CATEGORY_META } from '@/lib/phrases';
import { speak, listen, compareTranscripts, hasSpeechRecognition, hasSpeechSynthesis, getCapabilityMessage, RecognitionResult } from '@/lib/speech';
import { recordSession, saveWord, isWordSaved, getWeakPhraseIds } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────

type RoundPhase = 'presenting' | 'listening' | 'recording' | 'feedback' | 'notice';
type SessionPhase = 'playing' | 'summary';

interface RoundResult {
  phrase: Phrase;
  attempt: string;
  similarity: number;
  matchedWords: number;
  totalWords: number;
  feedback: string;
  skipped: boolean;
}

const ROUNDS_PER_SESSION = 5;
const DIFFICULTY_LABELS: Record<number, string> = { 1: '●', 2: '●●', 3: '●●●' };

// ─── Main Component ──────────────────────────────────────

export default function Arcade({ category, onExit }: {
  category: Category | 'mixed';
  onExit: () => void;
}) {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('playing');
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('presenting');
  const [results, setResults] = useState<RoundResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<RecognitionResult | null>(null);
  const [lastComparison, setLastComparison] = useState<ReturnType<typeof compareTranscripts> | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [capabilityNote, setCapabilityNote] = useState('');
  const [showEnglish, setShowEnglish] = useState(false);
  const [wordJustSaved, setWordJustSaved] = useState(false);

  // Initialize session — detect capabilities separately
  useEffect(() => {
    const tts = hasSpeechSynthesis();
    const stt = hasSpeechRecognition();
    setCanSpeak(tts);
    setCanListen(stt);
    const cap = getCapabilityMessage();
    setCapabilityNote(cap.message);

    const weakIds = getWeakPhraseIds(2);
    setPhrases(getPhrasesForSession(category, ROUNDS_PER_SESSION, weakIds));
  }, [category]);

  const currentPhrase = phrases[currentRound];
  const categoryMeta = category === 'mixed'
    ? { label: 'Gemischt', emoji: '✦' }
    : CATEGORY_META[category];

  // ─── Actions ─────────────────────────────────────────

  const playPhrase = useCallback(async () => {
    if (!currentPhrase || isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speak(currentPhrase.german, 'de-DE', 0.8);
    } catch {
      // TTS unavailable — degrade gracefully
    }
    setIsSpeaking(false);
  }, [currentPhrase, isSpeaking]);

  // Auto-play on present (only if TTS available)
  useEffect(() => {
    if (roundPhase === 'presenting' && currentPhrase && canSpeak) {
      const timer = setTimeout(() => playPhrase(), 600);
      return () => clearTimeout(timer);
    }
  }, [roundPhase, currentPhrase, canSpeak, playPhrase]);

  const startRecording = useCallback(async () => {
    if (!currentPhrase || isRecording) return;
    setRoundPhase('recording');
    setIsRecording(true);
    setLastAttempt(null);

    try {
      const result = await listen('de-DE', 10000);
      setLastAttempt(result);
      const comparison = compareTranscripts(currentPhrase.german, result.transcript);
      setLastComparison(comparison);

      // Update streak
      if (comparison.similarity >= 0.7) {
        setStreak(s => {
          const newStreak = s + 1;
          setBestStreak(b => Math.max(b, newStreak));
          return newStreak;
        });
      } else {
        setStreak(0);
      }

      setRoundPhase('feedback');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'timeout') {
        setLastAttempt({ transcript: '', confidence: 0 });
        setLastComparison({ similarity: 0, matchedWords: 0, totalWords: 0, feedback: 'Kein Audio erkannt. Versuch es noch einmal.' });
        setRoundPhase('feedback');
      } else if (msg === 'not-allowed' || msg === 'service-not-allowed') {
        setCanListen(false);
        setRoundPhase('presenting');
      } else {
        setRoundPhase('presenting');
      }
    } finally {
      setIsRecording(false);
    }
  }, [currentPhrase, isRecording]);

  const showNotice = useCallback(() => {
    if (!currentPhrase) return;
    // Save round result
    setResults(prev => [...prev, {
      phrase: currentPhrase,
      attempt: lastAttempt?.transcript || '',
      similarity: lastComparison?.similarity || 0,
      matchedWords: lastComparison?.matchedWords || 0,
      totalWords: lastComparison?.totalWords || 0,
      feedback: lastComparison?.feedback || '',
      skipped: !lastAttempt,
    }]);
    setWordJustSaved(false);
    setRoundPhase('notice');
  }, [currentPhrase, lastAttempt, lastComparison]);

  const nextRound = useCallback(() => {
    if (currentRound + 1 >= phrases.length) {
      setSessionPhase('summary');
    } else {
      setCurrentRound(r => r + 1);
      setRoundPhase('presenting');
      setLastAttempt(null);
      setLastComparison(null);
      setShowEnglish(false);
      setWordJustSaved(false);
    }
  }, [currentRound, phrases.length]);

  const skipRound = useCallback(() => {
    if (!currentPhrase) return;
    setResults(prev => [...prev, {
      phrase: currentPhrase,
      attempt: '',
      similarity: 0,
      matchedWords: 0,
      totalWords: 0,
      feedback: '',
      skipped: true,
    }]);
    setStreak(0);
    // Go straight to notice — don't skip the soul of the app
    setWordJustSaved(false);
    setRoundPhase('notice');
  }, [currentPhrase]);

  // "Listen only" advance — for when STT isn't available
  const advanceListenOnly = useCallback(() => {
    if (!currentPhrase) return;
    setResults(prev => [...prev, {
      phrase: currentPhrase,
      attempt: '',
      similarity: 0,
      matchedWords: 0,
      totalWords: 0,
      feedback: '',
      skipped: true,
    }]);
    setWordJustSaved(false);
    setRoundPhase('notice');
  }, [currentPhrase]);

  const retryRound = useCallback(() => {
    setRoundPhase('presenting');
    setLastAttempt(null);
    setLastComparison(null);
  }, []);

  const handleSaveWord = useCallback(() => {
    if (!currentPhrase) return;
    saveWord(currentPhrase.notice, currentPhrase.noticeNote, currentPhrase.german);
    setWordJustSaved(true);
  }, [currentPhrase]);

  // ─── Summary Screen ──────────────────────────────────

  if (sessionPhase === 'summary') {
    // Persist session to localStorage
    recordSession(
      results.map(r => ({
        phraseId: r.phrase.id,
        similarity: r.similarity,
        skipped: r.skipped,
      })),
      bestStreak,
    );

    return <SessionSummary
      results={results}
      bestStreak={bestStreak}
      category={categoryMeta}
      canListen={canListen}
      onExit={onExit}
      onPlayAgain={() => {
        const weakIds = getWeakPhraseIds(2);
        setPhrases(getPhrasesForSession(category, ROUNDS_PER_SESSION, weakIds));
        setCurrentRound(0);
        setRoundPhase('presenting');
        setResults([]);
        setStreak(0);
        setBestStreak(0);
        setSessionPhase('playing');
        setLastAttempt(null);
        setLastComparison(null);
        setWordJustSaved(false);
      }}
    />;
  }

  if (!currentPhrase) return null;

  // ─── Round Screen ────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={onExit} className="text-ink-faint text-sm font-mono hover:text-ink transition-colors">
          ← zurück
        </button>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-streak text-xs font-mono animate-fade-in">
              <span>🔥</span>
              <span>{streak}</span>
            </div>
          )}
          <span className="text-ink-faint text-xs font-mono">
            {currentRound + 1} / {phrases.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-5 mb-2">
        <div className="h-1 bg-surface-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-german rounded-full transition-all duration-500"
            style={{ width: `${((currentRound) / phrases.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Capability notice — shown once at top if degraded */}
      {capabilityNote && currentRound === 0 && roundPhase === 'presenting' && (
        <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl bg-surface-raised border border-accent/20 animate-fade-in">
          <p className="text-xs text-ink-muted leading-relaxed">{capabilityNote}</p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Category + difficulty */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-mono text-ink-faint">
            {currentPhrase.category === category || category === 'mixed'
              ? CATEGORY_META[currentPhrase.category].emoji
              : categoryMeta.emoji
            }
          </span>
          <span className="text-xs font-mono text-ink-faint">
            {CATEGORY_META[currentPhrase.category].label}
          </span>
          <span className="text-xs font-mono text-ink-faint ml-1">
            {DIFFICULTY_LABELS[currentPhrase.difficulty]}
          </span>
        </div>

        {/* German phrase */}
        <div className="text-center mb-8 max-w-md animate-fade-up" key={currentPhrase.id}>
          <p className="font-serif text-2xl md:text-3xl leading-relaxed tracking-wide text-ink">
            {currentPhrase.german}
          </p>

          {/* English toggle */}
          <button
            onClick={() => setShowEnglish(!showEnglish)}
            className="mt-3 text-xs font-mono text-ink-faint hover:text-ink-muted transition-colors"
          >
            {showEnglish ? currentPhrase.english : 'show english'}
          </button>
        </div>

        {/* Feedback area */}
        {roundPhase === 'feedback' && lastAttempt && lastComparison && (
          <div className="w-full max-w-md mb-8 animate-fade-up">
            {/* Score bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    lastComparison.similarity >= 0.7 ? 'bg-german' :
                    lastComparison.similarity >= 0.4 ? 'bg-accent' : 'bg-miss'
                  }`}
                  style={{ width: `${lastComparison.similarity * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-ink-muted w-16 text-right">
                {lastComparison.matchedWords}/{lastComparison.totalWords} Wörter
              </span>
            </div>

            {/* Attempt transcript */}
            {lastAttempt.transcript && (
              <div className="bg-surface-raised border border-border rounded-xl px-4 py-3 mb-3">
                <p className="text-xs font-mono text-ink-faint mb-1">Erkannt:</p>
                <p className="text-sm text-ink leading-relaxed">{lastAttempt.transcript}</p>
              </div>
            )}

            {/* Feedback — honest about what's measured */}
            <p className="text-sm text-ink-muted text-center font-serif italic">
              {lastComparison.feedback}
            </p>
            <p className="text-xs text-ink-faint text-center font-mono mt-1">
              Wortabgleich — keine Aussprachebewertung
            </p>
          </div>
        )}

        {/* Notice (word spotlight) — the soul of the app */}
        {roundPhase === 'notice' && (
          <div className="w-full max-w-md mb-8 animate-fade-up">
            <div className="bg-surface-raised border border-accent/30 rounded-xl px-5 py-5 shadow-sm shadow-accent-glow">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-mono text-accent">Wort zum Merken</p>
                <button
                  onClick={handleSaveWord}
                  disabled={wordJustSaved || isWordSaved(currentPhrase.notice, currentPhrase.german)}
                  className={`text-xs font-mono transition-all duration-200 ${
                    wordJustSaved || isWordSaved(currentPhrase.notice, currentPhrase.german)
                      ? 'text-german'
                      : 'text-ink-faint hover:text-accent'
                  }`}
                >
                  {wordJustSaved || isWordSaved(currentPhrase.notice, currentPhrase.german)
                    ? '✓ gemerkt'
                    : '+ merken'}
                </button>
              </div>
              <p className="font-serif text-2xl text-german mb-2">{currentPhrase.notice}</p>
              <p className="text-sm text-ink-muted leading-relaxed">{currentPhrase.noticeNote}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {roundPhase === 'presenting' && (
            <>
              {/* Play button — shown if TTS available */}
              {canSpeak && (
                <>
                  <button
                    onClick={playPhrase}
                    disabled={isSpeaking}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                      ${isSpeaking
                        ? 'bg-accent/20 text-accent scale-105'
                        : 'bg-surface-raised border border-border hover:border-accent text-ink-muted hover:text-accent'
                      }`}
                  >
                    <span className="text-2xl">{isSpeaking ? '🔊' : '▶'}</span>
                  </button>
                  <p className="text-xs font-mono text-ink-faint">
                    {isSpeaking ? 'spielt ab…' : 'nochmal hören'}
                  </p>
                </>
              )}

              {!canSpeak && (
                <p className="text-xs text-ink-faint font-mono text-center mb-2">
                  Kein Audio-Playback in diesem Browser — lies mit und sprich leise mit.
                </p>
              )}

              {/* Record — shown if STT available */}
              {canListen ? (
                <button
                  onClick={startRecording}
                  className="w-full py-3.5 rounded-xl bg-german text-surface font-medium
                    transition-all duration-200 hover:shadow-lg hover:shadow-german-glow active:scale-[0.98]"
                >
                  Jetzt sprechen
                </button>
              ) : (
                <button
                  onClick={advanceListenOnly}
                  className="w-full py-3.5 rounded-xl bg-german text-surface font-medium
                    transition-all duration-200 hover:shadow-lg hover:shadow-german-glow active:scale-[0.98]"
                >
                  {canSpeak ? 'Nachgesprochen — weiter' : 'Gelesen — weiter'}
                </button>
              )}

              {canListen && (
                <button onClick={skipRound} className="text-xs font-mono text-ink-faint hover:text-ink-muted transition-colors">
                  überspringen →
                </button>
              )}
            </>
          )}

          {roundPhase === 'recording' && (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-german/20 flex items-center justify-center animate-pulse-ring">
                <div className="w-14 h-14 rounded-full bg-german flex items-center justify-center">
                  <span className="text-surface text-2xl">●</span>
                </div>
              </div>
              <p className="text-sm font-mono text-german">Ich höre zu…</p>
            </div>
          )}

          {roundPhase === 'feedback' && (
            <div className="flex gap-3 w-full">
              <button
                onClick={retryRound}
                className="flex-1 py-3 rounded-xl bg-surface-raised border border-border
                  text-sm font-mono text-ink-muted hover:text-ink hover:border-ink-faint transition-all"
              >
                Nochmal
              </button>
              <button
                onClick={showNotice}
                className="flex-1 py-3 rounded-xl bg-accent text-surface
                  text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent-glow active:scale-[0.98]"
              >
                Weiter →
              </button>
            </div>
          )}

          {roundPhase === 'notice' && (
            <button
              onClick={nextRound}
              className="w-full py-3.5 rounded-xl bg-german text-surface font-medium
                transition-all duration-200 hover:shadow-lg hover:shadow-german-glow active:scale-[0.98]"
            >
              {currentRound + 1 >= phrases.length ? 'Ergebnis sehen' : 'Nächste Runde →'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}


// ─── Session Summary ─────────────────────────────────────

function SessionSummary({ results, bestStreak, category, canListen, onExit, onPlayAgain }: {
  results: RoundResult[];
  bestStreak: number;
  category: { label: string; emoji: string };
  canListen: boolean;
  onExit: () => void;
  onPlayAgain: () => void;
}) {
  const attempted = results.filter(r => !r.skipped);
  const strong = attempted.filter(r => r.similarity >= 0.7);
  const avgSimilarity = attempted.length > 0
    ? attempted.reduce((s, r) => s + r.similarity, 0) / attempted.length
    : 0;

  // Different verdict paths depending on whether STT was available
  let sessionVerdict: string;
  if (!canListen) {
    sessionVerdict = 'Gut zugehört. Jedes Mal sitzt es tiefer.';
  } else if (avgSimilarity >= 0.8) {
    sessionVerdict = 'Stark. Das sitzt.';
  } else if (avgSimilarity >= 0.6) {
    sessionVerdict = 'Gut. Du wirst sicherer.';
  } else if (avgSimilarity >= 0.4) {
    sessionVerdict = 'Auf dem Weg. Weitermachen.';
  } else {
    sessionVerdict = 'Ein Anfang. Jedes Mal wird es leichter.';
  }

  // Collect notice words from this session
  const sessionWords = results.map(r => ({
    word: r.phrase.notice,
    note: r.phrase.noticeNote,
    german: r.phrase.german,
  }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-up">
          <p className="text-xs font-mono text-ink-faint mb-2">sitzung abgeschlossen</p>
          <h2 className="font-serif text-3xl text-accent mb-2">{sessionVerdict}</h2>
          <p className="text-sm text-ink-muted font-serif italic">
            {category.emoji} {category.label}
          </p>
        </div>

        {/* Stats — only show match stats if STT was used */}
        <div className={`grid ${canListen ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-8 animate-fade-up`} style={{ animationDelay: '0.1s' }}>
          <StatBox label="Runden" value={`${results.length}`} />
          {canListen && (
            <StatBox label="Treffer" value={`${strong.length}/${attempted.length}`} sub="Wortabgleich" color="german" />
          )}
          <StatBox label="Streak" value={`${bestStreak}`} color="streak" />
        </div>

        {/* Session Merkwörter */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <p className="text-xs font-mono text-accent mb-3">Wörter dieser Sitzung</p>
          <div className="space-y-1.5">
            {sessionWords.map((w, i) => {
              const saved = isWordSaved(w.word, w.german);
              return (
                <div key={i} className="flex items-center justify-between bg-surface-raised rounded-lg px-4 py-2.5">
                  <span className="font-serif text-sm text-german">{w.word}</span>
                  <button
                    onClick={() => !saved && saveWord(w.word, w.note, w.german)}
                    className={`text-xs font-mono transition-colors ${
                      saved ? 'text-german' : 'text-ink-faint hover:text-accent'
                    }`}
                  >
                    {saved ? '✓' : '+ merken'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Round review */}
        {canListen && attempted.length > 0 && (
          <div className="space-y-2 mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs font-mono text-ink-faint mb-2">Runden</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-raised rounded-xl px-4 py-3">
                <span className={`text-sm font-mono w-6 ${
                  r.skipped ? 'text-ink-faint' :
                  r.similarity >= 0.7 ? 'text-german' :
                  r.similarity >= 0.4 ? 'text-accent' : 'text-miss'
                }`}>
                  {r.skipped ? '—' : r.similarity >= 0.7 ? '✓' : r.similarity >= 0.4 ? '~' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{r.phrase.german}</p>
                  <p className="text-xs text-ink-faint font-mono truncate">{r.phrase.notice}</p>
                </div>
                {!r.skipped && (
                  <span className="text-xs font-mono text-ink-faint">
                    {Math.round(r.similarity * 100)}%
                  </span>
                )}
              </div>
            ))}
            <p className="text-xs text-ink-faint font-mono text-center mt-1">
              Prozent = erkannte Wörter in Reihenfolge, nicht Aussprache
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl bg-german text-surface font-medium
              transition-all duration-200 hover:shadow-lg hover:shadow-german-glow active:scale-[0.98]"
          >
            Nochmal spielen
          </button>
          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-surface-raised border border-border
              text-sm font-mono text-ink-muted hover:text-ink hover:border-ink-faint transition-all"
          >
            Andere Kategorie
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-mono text-ink-faint mt-6">
          Jede Wiederholung macht es natürlicher.
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const textColor = color === 'german' ? 'text-german' : color === 'streak' ? 'text-streak' : 'text-ink';
  return (
    <div className="bg-surface-raised rounded-xl px-3 py-3 text-center">
      <p className={`text-2xl font-mono font-medium ${textColor}`}>{value}</p>
      <p className="text-xs font-mono text-ink-faint mt-1">{label}</p>
      {sub && <p className="text-[10px] font-mono text-ink-faint mt-0.5">{sub}</p>}
    </div>
  );
}
