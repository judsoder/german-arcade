'use client';

import { useState } from 'react';
import { Category, CATEGORY_META } from '@/lib/phrases';
import Arcade from './components/Arcade';

type Screen = 'home' | 'playing';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'mixed'>('mixed');

  if (screen === 'playing') {
    return (
      <Arcade
        category={selectedCategory}
        onExit={() => setScreen('home')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Title */}
      <div className="text-center mb-12 animate-fade-up">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-wide text-accent mb-3">
          Schattensprache
        </h1>
        <p className="text-ink-muted text-sm font-mono">
          hear it · say it · own it
        </p>
      </div>

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

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-ink-faint text-xs font-mono">
          5 rounds · listen · repeat · improve
        </p>
        <p className="text-ink-faint text-xs font-mono mt-1">
          works best with headphones
        </p>
      </div>
    </div>
  );
}

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
