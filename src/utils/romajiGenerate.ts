import { WordEntry } from '../types';

type Options = {
  includeAlt?: boolean;
  onUnknown?: (char: string, reading: string) => void;
};

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
  か: ['ka'],
  き: ['ki'],
  く: ['ku'],
  け: ['ke'],
  こ: ['ko'],
  さ: ['sa'],
  し: ['shi'],
  す: ['su'],
  せ: ['se'],
  そ: ['so'],
  た: ['ta'],
  ち: ['chi'],
  つ: ['tsu'],
  て: ['te'],
  と: ['to'],
  な: ['na'],
  に: ['ni'],
  ぬ: ['nu'],
  ね: ['ne'],
  の: ['no'],
  は: ['ha'],
  ひ: ['hi'],
  ふ: ['fu'],
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
  を: ['wo'],
  ん: ['n'],
  が: ['ga'],
  ぎ: ['gi'],
  ぐ: ['gu'],
  げ: ['ge'],
  ご: ['go'],
  ざ: ['za'],
  じ: ['ji'],
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

const YOUON: Record<string, string> = {
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
};

const toHiragana = (char: string) => {
  const code = char.charCodeAt(0);
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCharCode(code - 0x60);
  }
  return char;
};

const normalizeReading = (input: string) => input.split('').map(toHiragana).join('');

const consonantHead = (romaji: string) => {
  let res = '';
  for (const ch of romaji) {
    if (VOWELS.includes(ch)) break;
    res += ch;
  }
  return res || romaji[0] || '';
};

const peekBase = (reading: string, index: number): string | null => {
  const ch = reading[index];
  const next = reading[index + 1];
  if (ch && next && SMALL_Y.has(next) && YOUON[`${ch}${next}`]) {
    return YOUON[`${ch}${next}`];
  }
  if (ch && BASE[ch]) return BASE[ch][0];
  return null;
};

export const generateRomaji = (
  readingRaw: string,
  options?: Options,
): { primary: string; alt: string[] } => {
  const reading = normalizeReading(readingRaw);
  let romaji = '';
  const altSet = new Set<string>();
  let i = 0;

  const append = (value: string) => {
    romaji += value;
  };

  while (i < reading.length) {
    const ch = reading[i];
    if (SKIP.has(ch)) {
      i += 1;
      continue;
    }

    const next = reading[i + 1];
    if (next && SMALL_Y.has(next) && YOUON[`${ch}${next}`]) {
      append(YOUON[`${ch}${next}`]);
      i += 2;
      continue;
    }

    if (SMALL_TSU.has(ch)) {
      const base = peekBase(reading, i + 1);
      if (base) {
        const c = consonantHead(base);
        if (c) append(c);
        if (options?.includeAlt) {
          altSet.add(`${romaji}xtu${base}`);
          altSet.add(`${romaji}ltu${base}`);
        }
      }
      i += 1;
      continue;
    }

    if (ch === LONG_VOWEL) {
      const lastVowel = [...romaji].reverse().find((v) => VOWELS.includes(v));
      if (lastVowel) {
        append(lastVowel);
        if (options?.includeAlt) altSet.add(`${romaji}-`);
      }
      i += 1;
      continue;
    }

    if (ch === 'ん') {
      const base = peekBase(reading, i + 1) ?? '';
      const startsWithVowel = base && VOWELS.includes(base[0]);
      const startsWithY = base.startsWith('y');
      if (startsWithVowel || startsWithY) {
        append("n'");
        if (options?.includeAlt) altSet.add(`${romaji}nn`);
      } else {
        append('n');
      }
      i += 1;
      continue;
    }

    const base = BASE[ch]?.[0];
    if (base) {
      append(base);
    } else {
      append(ch);
      if (options?.onUnknown) options.onUnknown(ch, readingRaw);
      else console.warn('[romaji] unknown kana', ch, 'in', readingRaw);
    }
    i += 1;
  }

  return { primary: romaji, alt: [...altSet] };
};

export const attachRomajiToWords = (words: WordEntry[]): WordEntry[] =>
  words.map((w) => {
    if (w.romaji_primary) return w;
    const { primary, alt } = generateRomaji(w.reading, {
      includeAlt: true,
      onUnknown: (ch, reading) =>
        console.warn(`[romaji] unknown "${ch}" in id=${w.id ?? 'unknown'} reading=${reading}`),
    });
    return { ...w, romaji_primary: primary, romaji_alt: alt };
  });
