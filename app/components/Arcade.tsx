'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Category, Phrase, getPhrasesForSession, CATEGORY_META } from '@/lib/phrases';
import { speak, listen, compareTranscripts, hasSpeechRecognition, hasSpeechSynthesis, RecognitionResult } from '@/lib/speech';

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
  const [hasVoice, setHasVoice] = useState(true);
  const [showEnglish, setShowEnglish] = useState(false);

  // Initialize session
  useEffect(() => {
    setPhrases(getPhrasesForSession(category, ROUNDS_PER_SESSION));
    setHasVoice(hasSpeechRecognition() && hasSpeechSynthesis());
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

  // Auto-play on present
  useEffect(() => {
    if (roundPhase === 'presenting' && currentPhrase && hasVoice) {
      const timer = setTimeout(() => playPhrase(), 600);
      return () => clearTimeout(timer);
    }
  }, [roundPhase, currentPhrase, hasVoice, playPhrase]);

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
        setHasVoice(false);
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
    nextRound();
  }, [currentPhrase, nextRound]);

  const retryRound = useCallback(() => {
    setRoundPhase('presenting');
    setLastAttempt(null);
    setLastComparison(null);
  }, []);

  // ─── Summary Screen ──────────────────────────────────

  if (sessionPhase === 'summary') {
    return <SessionSummary results={results} bestStreak={bestStreak} category={categoryMeta} onExit={onExit} onPlayAgain={() => {
      setPhrases(getPhrasesForSession(category, ROUNDS_PER_SESSION));
      setCurrentRound(0);
      setRoundPhase('presenting');
      setResults([]);
      setStreak(0);
      setBestStreak(0);
      setSessionPhase('playing');
      setLastAttempt(null);
      setLastComparison(null);
    }} />;
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
              <span className="text-xs font-mono text-ink-muted w-12 text-right">
                {lastComparison.matchedWords}/{lastComparison.totalWords}
              </span>
            </div>

            {/* Attempt transcript */}
            {lastAttempt.transcript && (
              <div className="bg-surface-raised border border-border rounded-xl px-4 py-3 mb-3">
                <p className="text-xs font-mono text-ink-faint mb-1">Du hast gesagt:</p>
                <p className="text-sm text-ink leading-relaxed">{lastAttempt.transcript}</p>
              </div>
            )}

            {/* Feedback */}
            <p className="text-sm text-ink-muted text-center font-serif italic">
              {lastComparison.feedback}
            </p>
          </div>
        )}

        {/* Notice (word spotlight) */}
        {roundPhase === 'notice' && (
          <div className="w-full max-w-md mb-8 animate-fade-up">
            <div className="bg-surface-raised border border-accent/20 rounded-xl px-5 py-4">
              <p className="text-xs font-mono text-accent mb-2">Wort zum Merken</p>
              <p className="font-serif text-xl text-german mb-1">{currentPhrase.notice}</p>
              <p className="text-sm text-ink-muted leading-relaxed">{currentPhrase.noticeNote}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {roundPhase === 'presenting' && (
            <>
              {/* Play button */}
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

              {/* Record */}
              {hasVoice ? (
                <button
                  onClick={startRecording}
                  className="w-full py-3.5 rounded-xl bg-german text-surface font-medium
                    transition-all duration-200 hover:shadow-lg hover:shadow-german-glow active:scale-[0.98]"
                >
                  Jetzt sprechen
                </button>
              ) : (
                <p className="text-xs text-ink-faint font-mono text-center">
                  Spracherkennung nicht verfügbar in diesem Browser.
                </p>
              )}

              <button onClick={skipRound} className="text-xs font-mono text-ink-faint hover:text-ink-muted transition-colors">
                überspringen →
              </button>
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

function SessionSummary({ results, bestStreak, category, onExit, onPlayAgain }: {
  results: RoundResult[];
  bestStreak: number;
  category: { label: string; emoji: string };
  onExit: () => void;
  onPlayAgain: () => void;
}) {
  const attempted = results.filter(r => !r.skipped);
  const strong = attempted.filter(r => r.similarity >= 0.7);
  const avgSimilarity = attempted.length > 0
    ? attempted.reduce((s, r) => s + r.similarity, 0) / attempted.length
    : 0;

  let sessionVerdict: string;
  if (avgSimilarity >= 0.8) sessionVerdict = 'Stark. Das sitzt.';
  else if (avgSimilarity >= 0.6) sessionVerdict = 'Gut. Du wirst sicherer.';
  else if (avgSimilarity >= 0.4) sessionVerdict = 'Auf dem Weg. Weitermachen.';
  else sessionVerdict = 'Ein Anfang. Jedes Mal wird es leichter.';

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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <StatBox label="Runden" value={`${results.length}`} />
          <StatBox label="Treffer" value={`${strong.length}/${attempted.length}`} color="german" />
          <StatBox label="Streak" value={`${bestStreak}`} color="streak" />
        </div>

        {/* Round review */}
        <div className="space-y-2 mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
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
        </div>

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

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  const textColor = color === 'german' ? 'text-german' : color === 'streak' ? 'text-streak' : 'text-ink';
  return (
    <div className="bg-surface-raised rounded-xl px-3 py-3 text-center">
      <p className={`text-2xl font-mono font-medium ${textColor}`}>{value}</p>
      <p className="text-xs font-mono text-ink-faint mt-1">{label}</p>
    </div>
  );
}
