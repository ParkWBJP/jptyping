import { GameSettings, MatchResult, MatchState } from '../types';

const VOWELS = ['a', 'i', 'u', 'e', 'o'];
const SMALL_Y = new Set(['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ']);
const SMALL_TSU = new Set(['っ', 'ッ']);
const LONG_VOWEL = 'ー';
const SKIP = new Set(['、', '。', '！', '？', '・', '　', ' ', '～', '-']);

const BASE: Record<string, string[]> = {
  ぁ: ['a'],
  ぃ: ['i'],
  ぅ: ['u'],
  ぇ: ['e'],
  ぉ: ['o'],
  あ: ['a'],
  い: ['i'],
  う: ['u'],
  え: ['e'],
  お: ['o'],
  か: ['ka', 'ca'],
  き: ['ki'],
  く: ['ku'],
  け: ['ke'],
  こ: ['ko', 'co'],
  さ: ['sa'],
  し: ['shi', 'si'],
  す: ['su'],
  せ: ['se'],
  そ: ['so'],
  た: ['ta'],
  ち: ['chi', 'ti'],
  つ: ['tsu', 'tu'],
  て: ['te'],
  と: ['to'],
  な: ['na'],
  に: ['ni'],
  ぬ: ['nu'],
  ね: ['ne'],
  の: ['no'],
  は: ['ha'],
  ひ: ['hi'],
  ふ: ['fu', 'hu'],
  へ: ['he'],
  ほ: ['ho'],
  ま: ['ma'],
  み: ['mi'],
  む: ['mu'],
  め: ['me'],
  も: ['mo'],
  や: ['ya'],
  ゆ: ['yu'],
  よ: ['yo'],
  ら: ['ra'],
  り: ['ri'],
  る: ['ru'],
  れ: ['re'],
  ろ: ['ro'],
  わ: ['wa'],
  ゐ: ['wi'],
  ゑ: ['we'],
  を: ['wo', 'o'],
  ん: ['n', 'nn'],
  が: ['ga'],
  ぎ: ['gi'],
  ぐ: ['gu'],
  げ: ['ge'],
  ご: ['go'],
  ざ: ['za'],
  じ: ['ji', 'zi'],
  ず: ['zu'],
  ぜ: ['ze'],
  ぞ: ['zo'],
  だ: ['da'],
  ぢ: ['di'],
  づ: ['du'],
  で: ['de'],
  ど: ['do'],
  ば: ['ba'],
  び: ['bi'],
  ぶ: ['bu'],
  べ: ['be'],
  ぼ: ['bo'],
  ぱ: ['pa'],
  ぴ: ['pi'],
  ぷ: ['pu'],
  ぺ: ['pe'],
  ぽ: ['po'],
  ゔ: ['vu'],
  ゃ: ['ya'],
  ゅ: ['yu'],
  ょ: ['yo'],
};

const YOUON: Record<string, string[]> = {
  きゃ: ['kya'],
  きゅ: ['kyu'],
  きょ: ['kyo'],
  しゃ: ['sha', 'sya'],
  しゅ: ['shu', 'syu'],
  しょ: ['sho', 'syo'],
  ちゃ: ['cha', 'cya', 'tya'],
  ちゅ: ['chu', 'cyu', 'tyu'],
  ちょ: ['cho', 'cyo', 'tyo'],
  にゃ: ['nya'],
  にゅ: ['nyu'],
  にょ: ['nyo'],
  ひゃ: ['hya'],
  ひゅ: ['hyu'],
  ひょ: ['hyo'],
  みゃ: ['mya'],
  みゅ: ['myu'],
  みょ: ['myo'],
  りゃ: ['rya'],
  りゅ: ['ryu'],
  りょ: ['ryo'],
  ぎゃ: ['gya'],
  ぎゅ: ['gyu'],
  ぎょ: ['gyo'],
  じゃ: ['ja', 'jya', 'zya'],
  じゅ: ['ju', 'jyu', 'zyu'],
  じょ: ['jo', 'jyo', 'zyo'],
  びゃ: ['bya'],
  びゅ: ['byu'],
  びょ: ['byo'],
  ぴゃ: ['pya'],
  ぴゅ: ['pyu'],
  ぴょ: ['pyo'],
};

const consonantHead = (romaji: string) => {
  let res = '';
  for (const ch of romaji) {
    if (VOWELS.includes(ch)) break;
    res += ch;
  }
  return res || romaji[0] || '';
};

const toHiragana = (char: string) => {
  const code = char.charCodeAt(0);
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCharCode(code - 0x60);
  }
  return char;
};

const normalizeReading = (input: string) => input.split('').map(toHiragana).join('');

const skipPassive = (reading: string, index: number) => {
  let idx = index;
  while (idx < reading.length && SKIP.has(reading[idx])) {
    idx += 1;
  }
  return idx;
};

type TokenType = 'plain' | 'youon' | 'smallTsu' | 'n' | 'long';

interface TokenInfo {
  token: string;
  length: number;
  type: TokenType;
}

const extractToken = (reading: string, index: number): TokenInfo | null => {
  if (index >= reading.length) return null;
  const current = toHiragana(reading[index]);
  const next = reading[index + 1] ? toHiragana(reading[index + 1]) : '';

  if (SMALL_TSU.has(current)) return { token: current, length: 1, type: 'smallTsu' };
  if (current === 'ん') return { token: current, length: 1, type: 'n' };
  if (current === LONG_VOWEL) return { token: current, length: 1, type: 'long' };
  if (next && SMALL_Y.has(next) && YOUON[`${current}${next}`]) {
    return { token: `${current}${next}`, length: 2, type: 'youon' };
  }
  return { token: current, length: 1, type: 'plain' };
};

const baseRomaji = (token: string) => {
  const normalized = normalizeReading(token);
  return YOUON[normalized] ?? BASE[normalized] ?? [normalized];
};

const getNextRomajiOptions = (
  state: MatchState,
  settings: GameSettings,
): { options: string[]; token: TokenInfo | null } => {
  const nextIndex = skipPassive(state.reading, state.index);
  const token = extractToken(state.reading, nextIndex);
  if (!token) return { options: [], token: null };

  if (token.type === 'smallTsu') {
    const upcoming = extractToken(state.reading, nextIndex + token.length);
    if (upcoming) {
      const [first] = baseRomaji(upcoming.token);
      const c = consonantHead(first);
      const doubled = c ? `${c[0]}` : '';
      const options = doubled ? [doubled] : [];
      if (settings.allowExplicitSmallTsu) {
        options.push('ltu', 'xtu');
      }
      return { options, token };
    }
    return { options: settings.allowExplicitSmallTsu ? ['ltu', 'xtu'] : [], token };
  }

  if (token.type === 'long') {
    const lastVowel = [...state.lastRomaji].reverse().find((ch) => VOWELS.includes(ch));
    return { options: lastVowel ? [lastVowel] : ['-'], token };
  }

  if (token.type === 'n') {
    const upcoming = extractToken(state.reading, nextIndex + token.length);
    if (!upcoming) {
      return { options: ['n', 'nn'], token };
    }
    const [head] = baseRomaji(upcoming.token);
    const startsWithVowel = VOWELS.includes(head[0]);
    const startsWithY = head.startsWith('y');
    if (startsWithVowel || startsWithY) {
      return { options: ["n'", 'nn'], token };
    }
    return { options: ['n', 'nn'], token };
  }

  return { options: baseRomaji(token.token), token };
};

export const createMatchState = (reading: string): MatchState => ({
  reading,
  index: 0,
  buffer: '',
  lastRomaji: '',
});

export const expectedNextChars = (state: MatchState, settings: GameSettings): string[] => {
  const { options } = getNextRomajiOptions(state, settings);
  const unique = new Set<string>();
  options.forEach((opt) => {
    const char = opt[state.buffer.length] ?? opt[0];
    if (char) unique.add(char);
  });
  return [...unique].slice(0, 3);
};

export const applyKeystroke = (state: MatchState, key: string, settings: GameSettings): MatchResult => {
  let workingState: MatchState = { ...state };
  const normalizedKey = key.toLowerCase();

  const skipped = skipPassive(workingState.reading, workingState.index);
  if (skipped !== workingState.index) {
    workingState = { ...workingState, index: skipped };
  }

  const { options, token } = getNextRomajiOptions(workingState, settings);
  if (!token) {
    return { state: workingState, status: 'completed', advanced: false, expected: [] };
  }

  if (normalizedKey === 'backspace') {
    if (settings.allowBackspace && workingState.buffer.length > 0) {
      const nextState = { ...workingState, buffer: workingState.buffer.slice(0, -1) };
      return { state: nextState, status: 'progress', advanced: false, expected: expectedNextChars(nextState, settings) };
    }
    return { state: workingState, status: 'error', advanced: false, expected: expectedNextChars(workingState, settings) };
  }

  const candidateBuffer = `${workingState.buffer}${normalizedKey}`;
  const validPrefix = options.some((opt) => opt.startsWith(candidateBuffer));
  if (!validPrefix) {
    return { state: workingState, status: 'error', advanced: false, expected: expectedNextChars(workingState, settings) };
  }

  const completedOption = options.find((opt) => opt === candidateBuffer);
  if (completedOption) {
    const nextIndex = skipPassive(workingState.reading, workingState.index + token.length);
    const nextState: MatchState = {
      reading: workingState.reading,
      index: nextIndex,
      buffer: '',
      lastRomaji: completedOption,
    };
    const status = nextIndex >= workingState.reading.length ? 'completed' : 'progress';
    return { state: nextState, status, advanced: true, expected: expectedNextChars(nextState, settings) };
  }

  const partialState = { ...workingState, buffer: candidateBuffer };
  return { state: partialState, status: 'progress', advanced: false, expected: expectedNextChars(partialState, settings) };
};

export const completionRatio = (state: MatchState) => {
  const clean = normalizeReading(state.reading).replace(/[、。！？”＂・　 \-]/g, '');
  return clean.length === 0 ? 0 : Math.min(1, state.index / clean.length);
};
