export type Theme = 'light' | 'dark';

export interface WordEntry {
  id?: string;
  display: string;
  reading: string;
  ko: string;
  level: number;
  tags?: string[];
  romaji_primary?: string;
  romaji_alt?: string[];
}

export interface SentenceEntry {
  id?: string;
  text: string;
  reading: string;
  ko: string;
  level: number;
  source?: string;
  title_kana?: string;
  title_kanji?: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  volume: number;
  romajiHint: boolean;
  keyboardGuide: boolean;
  wordDifficulty: number;
  sentenceDifficulty: number;
  showFurigana: boolean;
  theme: Theme;
  allowExplicitSmallTsu: boolean;
  allowBackspace: boolean;
}

export interface StatSnapshot {
  score: number;
  correct: number;
  mistakes: number;
  combo: number;
  maxCombo: number;
  kpm: number;
  accuracy: number;
}

export interface WordFallingItem {
  id: string;
  entry: WordEntry;
  y: number;
  x: number;
  speed: number;
  progress: number;
  createdAt: number;
}

export interface MatchState {
  reading: string;
  index: number;
  buffer: string;
  lastRomaji: string;
}

export interface MatchResult {
  state: MatchState;
  status: 'progress' | 'completed' | 'error';
  advanced: boolean;
  expected: string[];
}

export interface WordLevelConfig {
  fallSpeed: number;
  spawnInterval: number;
  maxWords: number;
  baseScore: number;
  lengthBias: number;
}

export interface SentenceSegment {
  jp: string;
  reading: string;
}
