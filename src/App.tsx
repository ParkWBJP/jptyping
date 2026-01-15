import React, { useEffect, useMemo, useRef, useState } from 'react';
import WordRainGame from './components/WordRainGame';
import SentenceGame from './components/SentenceGame';
import SettingsModal from './components/SettingsModal';
import { sentenceBank } from './data/sentences';
import { GameSettings, Theme, WordEntry, SentenceEntry } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { attachRomajiToWords } from './utils/romajiGenerate';

const defaultSettings: GameSettings = {
  soundEnabled: true,
  volume: 0.4,
  romajiHint: true,
  keyboardGuide: true,
  wordDifficulty: 3,
  sentenceDifficulty: 1,
  showFurigana: false,
  theme: 'dark',
  allowExplicitSmallTsu: true,
  allowBackspace: true,
};

type Tab = 'word' | 'sentence';

const fallbackWords: WordEntry[] = attachRomajiToWords([
  { id: 'FB001', display: 'ありがとう', reading: 'ありがとう', ko: '고마워', level: 1, tags: ['basic'] },
  { id: 'FB002', display: '待つ', reading: 'まつ', ko: '기다리다', level: 2, tags: ['verb'] },
  { id: 'FB003', display: '雨', reading: 'あめ', ko: '비', level: 1, tags: ['noun'] },
  { id: 'FB004', display: '公園', reading: 'こうえん', ko: '공원', level: 2, tags: ['noun'] },
]);

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('word');
  const [settings, setSettings] = useLocalStorage<GameSettings>('jp-typing-settings', defaultSettings);
  const [customWords, setCustomWords] = useLocalStorage<WordEntry[]>('jp-custom-words', []);
  const [customSentences, setCustomSentences] = useLocalStorage<SentenceEntry[]>('jp-custom-sentences', []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const sentenceInputRef = useRef<HTMLInputElement>(null);

  // Load word bank from TSV and enrich with romaji
  useEffect(() => {
    const loadExternal = async () => {
      try {
        const res = await fetch('/word-bank.tsv');
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
        if (lines.length === 0) return;
        const header = lines[0].split('\t').map((h) => h.replace(/\uFEFF/g, '').trim());
        const items: WordEntry[] = [];
        for (let i = 1; i < lines.length; i += 1) {
          const cols = lines[i].split('\t');
          if (cols.length < header.length) continue;
          const map: Record<string, string> = {};
          header.forEach((h, idx) => {
            map[h] = cols[idx] ?? '';
          });
          if (!map.display || !map.reading) continue;
          const level10 = Number(map.level10 || map.level || 5);
          items.push({
            id: map.id || `${i}`,
            display: map.display,
            reading: map.reading,
            ko: map.ko,
            level: Math.min(10, Math.max(1, Math.round(level10))),
            tags: [map.category || '', map.pos || ''].filter(Boolean),
          });
        }
        if (items.length) setCustomWords(attachRomajiToWords(items));
      } catch (err) {
        console.warn('Failed to load external word bank', err);
      }
    };
    loadExternal();
  }, [setCustomWords]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const words = useMemo(
    () => attachRomajiToWords(customWords.length ? customWords : fallbackWords),
    [customWords],
  );
  const sentences = useMemo(() => [...sentenceBank, ...customSentences], [customSentences]);

  const toggleTheme = () => {
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const resetStorage = () => {
    setSettings(defaultSettings);
    setCustomWords([]);
    setCustomSentences([]);
    window.localStorage.removeItem('jp-typing-settings');
    window.localStorage.removeItem('jp-custom-words');
    window.localStorage.removeItem('jp-custom-sentences');
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          유키하루 일본어타이핑
          <span className="pill">JP ローマ字練習</span>
        </div>
        <div className="tab-bar" role="tablist">
          <button className={`tab ${tab === 'word' ? 'active' : ''}`} role="tab" onClick={() => setTab('word')}>
            단어 게임
          </button>
          <button
            className={`tab ${tab === 'sentence' ? 'active' : ''}`}
            role="tab"
            onClick={() => setTab('sentence')}
          >
            문장 게임
          </button>
        </div>
        <div className="flex">
          <button className="icon-button ghost" onClick={toggleTheme}>
            {settings.theme === 'dark' ? '라이트' : '다크'}
          </button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)}>
            ⚙️ 설정
          </button>
        </div>
      </header>

      {tab === 'word' ? (
        <WordRainGame active={tab === 'word'} settings={settings} words={words} />
      ) : (
        <SentenceGame active={tab === 'sentence'} settings={settings} sentences={sentences} />
      )}

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={setSettings}
        onReset={resetStorage}
      />

      {guideOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal>
          <div className="modal">
            <div className="controls" style={{ justifyContent: 'space-between' }}>
              <h2>일본어 입력 가이드</h2>
              <button className="icon-button ghost" onClick={() => setGuideOpen(false)}>
                닫기
              </button>
            </div>
            <div className="guide-content">
              {`1) 작은 「っ」(促音)
 - 기본: 다음 자음 두 번 (かった → katta)
 - 보조: xtu / ltu 입력도 가능
2) 「を」(조사) → wo
3) 작은 「ゃ」「ゅ」「ょ」 → kya / kyu / kyo 등
4) 작은 모음 ぁぃぅぇぉ → xa/xi/xu/xe/xo
5) 장음 「ー」: 모음 반복 (スーパー → suupaa)
6) 「ん」: 모음/やゆよ 앞에서는 n' 권장 (しんよう → shin'you)
7) づ/ぢ → du/di 고정
8) 가타카나 실전 조합: シェ(she), チェ(che), ジェ(je), ツァ/ツィ/ツェ/ツォ(tsa/tsi/tse/tso), フォ(fo)`}
            </div>
          </div>
        </div>
      )}

      <button
        className="icon-button"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#0a0d12',
          fontWeight: 800,
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        }}
        onClick={() => setGuideOpen(true)}
      >
        일본어 입력 가이드
      </button>

      <footer className="hint" style={{ textAlign: 'center', marginTop: 8 }}>
        COPYRIGHT©2026 by Parkgunsoo
      </footer>
    </div>
  );
};

export default App;
