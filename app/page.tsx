'use client';

import { useState, useEffect } from 'react';
import { Category, CATEGORY_META } from '@/lib/phrases';
import { getStore, getSavedWords, removeSavedWord, SavedWord } from '@/lib/store';
import Arcade from './components/Arcade';

type Screen = 'home' | 'playing' | 'merkwoerter';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'mixed'>('mixed');
  const [sessionsPlayed, setSessionsPlayed] = useState(0);
  const [allTimeBestStreak, setAllTimeBestStreak] = useState(0);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  // Load store on mount and when returning from arcade
  useEffect(() => {
    if (screen === 'home' || screen === 'merkwoerter') {
      const store = getStore();
      setSessionsPlayed(store.sessionsPlayed);
      setAllTimeBestStreak(store.bestStreak);
      setSavedWords(getSavedWords());
    }
  }, [screen]);

  if (screen === 'playing') {
    return (
      <Arcade
        category={selectedCategory}
        onExit={() => setScreen('home')}
      />
    );
  }

  if (screen === 'merkwoerter') {
    return (
      <MerkwoerterShelf
        words={savedWords}
        onRemove={(word, phraseGerman) => {
          removeSavedWord(word, phraseGerman);
          setSavedWords(getSavedWords());
        }}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Title */}
      <div className="text-center mb-10 animate-fade-up">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-wide text-accent mb-3">
          Schattensprache
        </h1>
        <p className="text-ink-muted text-sm font-mono">
          hear it · read it · shadow it
        </p>
      </div>

      {/* Welcome back */}
      {sessionsPlayed > 0 && (
        <div className="mb-6 text-center animate-fade-in">
          <p className="text-xs font-mono text-ink-faint">
            {sessionsPlayed} {sessionsPlayed === 1 ? 'Sitzung' : 'Sitzungen'} gespielt
            {allTimeBestStreak > 0 && ` · Beststreak: ${allTimeBestStreak}`}
          </p>
        </div>
      )}

      {/* Category select */}
      <div className="w-full max-w-sm space-y-2 mb-8">
        {/* Mixed / all */}
        <CategoryButton
          emoji="✦"
          label="Gemischt"
          description="Mix of everything"
          selected={selectedCategory === 'mixed'}
          onClick={() => setSelectedCategory('mixed')}
        />

        {(Object.keys(CATEGORY_META) as Category[]).map(cat => (
          <CategoryButton
            key={cat}
            emoji={CATEGORY_META[cat].emoji}
            label={CATEGORY_META[cat].label}
            description={CATEGORY_META[cat].description}
            selected={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          />
        ))}
      </div>

      {/* Start */}
      <button
        onClick={() => setScreen('playing')}
        className="w-full max-w-sm py-4 rounded-2xl bg-german text-surface font-medium
          text-lg tracking-wide transition-all duration-200
          hover:shadow-lg hover:shadow-german-glow active:scale-[0.98]"
      >
        Starten
      </button>

      {/* Merkwörter shelf link */}
      {savedWords.length > 0 && (
        <button
          onClick={() => setScreen('merkwoerter')}
          className="mt-4 flex items-center gap-2 text-sm font-mono text-accent hover:text-ink transition-colors"
        >
          <span>✦</span>
          <span>{savedWords.length} Merkwörter</span>
        </button>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-ink-faint text-xs font-mono">
          5 rounds · listen · shadow · notice
        </p>
        <p className="text-ink-faint text-xs font-mono mt-1">
          works best in Chrome/Edge · headphones recommended
        </p>
        <p className="text-ink-faint text-[10px] font-mono mt-1">
          Safari/Firefox: listen-only mode (no speech recognition)
        </p>
      </div>
    </div>
  );
}


// ─── Merkwörter Shelf ─────────────────────────────────────

function MerkwoerterShelf({ words, onRemove, onBack }: {
  words: SavedWord[];
  onRemove: (word: string, phraseGerman: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-ink-faint text-sm font-mono hover:text-ink transition-colors">
          ← zurück
        </button>
        <span className="text-xs font-mono text-ink-faint">
          {words.length} {words.length === 1 ? 'Wort' : 'Wörter'}
        </span>
      </header>

      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8 animate-fade-up">
          <h2 className="font-serif text-3xl text-accent mb-2">Merkwörter</h2>
          <p className="text-sm text-ink-muted font-mono">
            Wörter und Wendungen, die hängenbleiben sollen
          </p>
        </div>

        {words.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-faint text-sm font-mono">
              Noch keine Merkwörter gespeichert.
            </p>
            <p className="text-ink-faint text-xs font-mono mt-2">
              Drück &quot;+ merken&quot; bei Wort zum Merken, um Wörter hier zu sammeln.
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {words.map((w, i) => (
              <div key={`${w.word}-${i}`} className="bg-surface-raised border border-border rounded-xl px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-serif text-xl text-german">{w.word}</p>
                  <button
                    onClick={() => onRemove(w.word, w.phraseGerman)}
                    className="text-xs font-mono text-ink-faint hover:text-miss transition-colors ml-3 mt-1"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed mb-2">{w.note}</p>
                <p className="text-xs text-ink-faint font-mono italic truncate">
                  aus: {w.phraseGerman}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Category Button ──────────────────────────────────────

function CategoryButton({ emoji, label, description, selected, onClick }: {
  emoji: string; label: string; description: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 px-5 py-3.5 rounded-xl
        transition-all duration-200 text-left
        ${selected
          ? 'bg-surface-active border border-accent/30 shadow-sm shadow-accent-glow'
          : 'bg-surface-raised border border-border hover:border-ink-faint'
        }
      `}
    >
      <span className="text-xl w-8 text-center">{emoji}</span>
      <div className="flex-1">
        <span className={`font-serif text-lg ${selected ? 'text-accent' : 'text-ink'}`}>
          {label}
        </span>
        <span className="text-ink-faint text-xs font-mono ml-2">{description}</span>
      </div>
      {selected && <span className="text-accent text-sm">●</span>}
    </button>
  );
}
