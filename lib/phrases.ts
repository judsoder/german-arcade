/**
 * German Shadowing Arcade — phrase bank.
 * 
 * Categories cover different registers and situations.
 * Each phrase has German text, English meaning, a "notice" word,
 * and a difficulty tier.
 */

export type Category = 'daily' | 'literary' | 'travel' | 'feeling' | 'expressive';
export type Difficulty = 1 | 2 | 3;

export interface Phrase {
  id: string;
  german: string;
  english: string;
  notice: string;        // one word/phrase to pay attention to
  noticeNote: string;    // why it matters
  category: Category;
  difficulty: Difficulty;
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; description: string }> = {
  daily: { label: 'Alltag', emoji: '☕', description: 'Everyday speech' },
  literary: { label: 'Literatur', emoji: '📖', description: 'Literary & reflective' },
  travel: { label: 'Unterwegs', emoji: '🗺', description: 'Travel & situations' },
  feeling: { label: 'Gefühle', emoji: '💭', description: 'Emotional language' },
  expressive: { label: 'Ausdruck', emoji: '✦', description: 'Expressive & personal' },
};

export const PHRASES: Phrase[] = [
  // ── Daily ────────────────────────────────────
  {
    id: 'd1', category: 'daily', difficulty: 1,
    german: 'Ich hätte gern einen Kaffee, bitte.',
    english: "I'd like a coffee, please.",
    notice: 'hätte gern',
    noticeNote: 'Subjunctive — softer than "ich will." This is how adults order.',
  },
  {
    id: 'd2', category: 'daily', difficulty: 1,
    german: 'Entschuldigung, wo ist die nächste U-Bahn?',
    english: 'Excuse me, where is the nearest subway?',
    notice: 'die nächste',
    noticeNote: 'Feminine article because U-Bahn is feminine. The adjective ending matches.',
  },
  {
    id: 'd3', category: 'daily', difficulty: 1,
    german: 'Das macht nichts. Wirklich, kein Problem.',
    english: "It doesn't matter. Really, no problem.",
    notice: 'Das macht nichts',
    noticeNote: 'Literally "that makes nothing." Very natural dismissal.',
  },
  {
    id: 'd4', category: 'daily', difficulty: 2,
    german: 'Könnten Sie mir bitte sagen, wie spät es ist?',
    english: 'Could you please tell me what time it is?',
    notice: 'Könnten Sie',
    noticeNote: 'Formal "could you" — Konjunktiv II of können. Polite register.',
  },
  {
    id: 'd5', category: 'daily', difficulty: 2,
    german: 'Ich bin gerade ein bisschen im Stress, aber das wird schon.',
    english: "I'm a bit stressed right now, but it'll be fine.",
    notice: 'das wird schon',
    noticeNote: 'Classic German reassurance. "It\'ll work out." Understated optimism.',
  },
  {
    id: 'd6', category: 'daily', difficulty: 3,
    german: 'Ehrlich gesagt, habe ich mir das anders vorgestellt.',
    english: 'Honestly, I imagined it differently.',
    notice: 'sich etwas vorstellen',
    noticeNote: 'Reflexive + separable prefix. "Vorgestellt" comes from "sich vorstellen."',
  },

  // ── Literary ─────────────────────────────────
  {
    id: 'l1', category: 'literary', difficulty: 2,
    german: 'Man sieht nur mit dem Herzen gut.',
    english: 'One sees clearly only with the heart.',
    notice: 'nur mit dem Herzen',
    noticeNote: 'From Saint-Exupéry, but deeply adopted into German. Dative: dem Herzen.',
  },
  {
    id: 'l2', category: 'literary', difficulty: 2,
    german: 'Der Weg ist das Ziel.',
    english: 'The path is the destination.',
    notice: 'das Ziel',
    noticeNote: 'Neuter noun. A very German idea — the process matters more than arrival.',
  },
  {
    id: 'l3', category: 'literary', difficulty: 3,
    german: 'Wer zu sich selbst finden will, darf andere nicht nach dem Weg fragen.',
    english: 'Whoever wants to find themselves must not ask others for the way.',
    notice: 'zu sich selbst finden',
    noticeNote: 'Reflexive with preposition. Literally "find to oneself." Very Hesse.',
  },
  {
    id: 'l4', category: 'literary', difficulty: 3,
    german: 'Die Gedanken sind frei, wer kann sie erraten?',
    english: 'Thoughts are free — who can guess them?',
    notice: 'erraten',
    noticeNote: 'To guess correctly. The "er-" prefix means completing the action.',
  },
  {
    id: 'l5', category: 'literary', difficulty: 2,
    german: 'Jeder Augenblick ist von unendlichem Wert.',
    english: 'Every moment is of infinite value.',
    notice: 'von unendlichem Wert',
    noticeNote: 'Goethe. Dative after "von." Adjective ending "-em" for masculine dative.',
  },
  {
    id: 'l6', category: 'literary', difficulty: 3,
    german: 'Im Schatten des Hauses, in der Sonne des Flußufers wuchs der Knabe auf.',
    english: 'In the shadow of the house, in the sunshine of the riverbank, the boy grew up.',
    notice: 'wuchs auf',
    noticeNote: 'Separable prefix verb "aufwachsen" in past tense. Opening of Siddhartha.',
  },

  // ── Travel ───────────────────────────────────
  {
    id: 't1', category: 'travel', difficulty: 1,
    german: 'Haben Sie noch ein Zimmer frei?',
    english: 'Do you have a room available?',
    notice: 'frei',
    noticeNote: 'Adjective at end — predicate position. "Ein Zimmer frei" is the natural word order.',
  },
  {
    id: 't2', category: 'travel', difficulty: 1,
    german: 'Die Rechnung, bitte.',
    english: 'The bill, please.',
    notice: 'die Rechnung',
    noticeNote: 'Feminine. Also means "calculation" — same root as "rechnen" (to calculate).',
  },
  {
    id: 't3', category: 'travel', difficulty: 2,
    german: 'Ich würde gern am Fenster sitzen, wenn es möglich ist.',
    english: "I'd like to sit by the window, if possible.",
    notice: 'würde gern',
    noticeNote: 'Konjunktiv II — polite request form. More refined than "ich will."',
  },
  {
    id: 't4', category: 'travel', difficulty: 2,
    german: 'Können Sie mir den Weg zum Bahnhof zeigen?',
    english: 'Can you show me the way to the train station?',
    notice: 'den Weg zeigen',
    noticeNote: 'Accusative "den Weg" + dative "mir." Double object construction.',
  },
  {
    id: 't5', category: 'travel', difficulty: 3,
    german: 'Es tut mir leid, aber ich glaube, Sie haben sich in der Tür geirrt.',
    english: "I'm sorry, but I think you've got the wrong door.",
    notice: 'sich irren',
    noticeNote: 'Reflexive verb meaning "to be mistaken." Very polite way to correct someone.',
  },

  // ── Feeling ──────────────────────────────────
  {
    id: 'f1', category: 'feeling', difficulty: 1,
    german: 'Ich freue mich, dich zu sehen.',
    english: "I'm happy to see you.",
    notice: 'sich freuen',
    noticeNote: 'Reflexive. Literally "I happy myself to see you." The joy is self-directed.',
  },
  {
    id: 'f2', category: 'feeling', difficulty: 2,
    german: 'Das berührt mich mehr, als ich sagen kann.',
    english: 'That touches me more than I can say.',
    notice: 'berührt',
    noticeNote: 'Physical and emotional touching — same word. "Be-" prefix intensifies.',
  },
  {
    id: 'f3', category: 'feeling', difficulty: 2,
    german: 'Ich vermisse dich. Das wollte ich dir einfach sagen.',
    english: 'I miss you. I just wanted to tell you that.',
    notice: 'vermissen',
    noticeNote: 'No reflexive needed — unlike English "I miss you." Direct and clean.',
  },
  {
    id: 'f4', category: 'feeling', difficulty: 3,
    german: 'Manchmal weiß ich nicht, ob ich traurig bin oder einfach nur müde.',
    english: "Sometimes I don't know if I'm sad or just tired.",
    notice: 'ob',
    noticeNote: '"Whether/if" — sends the verb to the end. "ob ich traurig bin."',
  },
  {
    id: 'f5', category: 'feeling', difficulty: 2,
    german: 'Es tut mir leid. Das meine ich ernst.',
    english: "I'm sorry. I mean that seriously.",
    notice: 'ernst meinen',
    noticeNote: '"To mean seriously." Very useful — distinguishes real apology from formula.',
  },

  // ── Expressive ───────────────────────────────
  {
    id: 'e1', category: 'expressive', difficulty: 2,
    german: 'Das habe ich so nicht gemeint. Lass mich es anders sagen.',
    english: "I didn't mean it that way. Let me say it differently.",
    notice: 'anders sagen',
    noticeNote: 'Reformulating yourself. Key meta-communication skill in any language.',
  },
  {
    id: 'e2', category: 'expressive', difficulty: 2,
    german: 'Weißt du, was mich wirklich bewegt hat?',
    english: 'You know what really moved me?',
    notice: 'bewegt',
    noticeNote: 'Past participle of "bewegen" — to move emotionally. Sets up a story.',
  },
  {
    id: 'e3', category: 'expressive', difficulty: 3,
    german: 'Ich glaube, man muss aufhören zu suchen, um zu finden.',
    english: 'I think you have to stop searching in order to find.',
    notice: 'um zu finden',
    noticeNote: '"In order to" construction. "Um...zu" + infinitive at the end.',
  },
  {
    id: 'e4', category: 'expressive', difficulty: 1,
    german: 'Das ist genau das, was ich meine.',
    english: "That's exactly what I mean.",
    notice: 'genau das, was',
    noticeNote: '"Exactly that which" — a satisfying construction for precise agreement.',
  },
  {
    id: 'e5', category: 'expressive', difficulty: 3,
    german: 'Bauen, nicht suchen. Das ist vielleicht die eigentliche Übung.',
    english: "Building, not seeking. That's perhaps the real practice.",
    notice: 'die eigentliche Übung',
    noticeNote: '"The actual/real practice." Eigentlich = actually/truly. Very reflective.',
  },
  {
    id: 'e6', category: 'expressive', difficulty: 2,
    german: 'Lass uns darüber reden. Nicht jetzt, aber bald.',
    english: "Let's talk about it. Not now, but soon.",
    notice: 'darüber',
    noticeNote: '"About it" — da + über. Replaces "über es." Very common in real speech.',
  },
];

// ─── Selection helpers ──────────────────────────────────

export function getPhrasesForCategory(category: Category): Phrase[] {
  return PHRASES.filter(p => p.category === category);
}

export function getPhrasesForSession(category: Category | 'mixed', count: number = 5): Phrase[] {
  let pool: Phrase[];
  if (category === 'mixed') {
    pool = [...PHRASES];
  } else {
    pool = PHRASES.filter(p => p.category === category);
  }

  // Shuffle
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
