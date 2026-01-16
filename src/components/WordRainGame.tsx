import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WordFallingItem, GameSettings, MatchState, WordLevelConfig, WordEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { applyKeystroke, createMatchState, expectedNextChars, completionRatio } from '../utils/romanizer';
import { generateRomaji } from '../utils/romajiGenerate';
import StatCard from './StatCard';
import KeyboardOverlay from './KeyboardOverlay';
import EffectsLayer from './EffectsLayer';
import { useAudio } from '../hooks/useAudio';

interface Props {
  settings: GameSettings;
  active: boolean;
  words: WordEntry[];
}

const WORD_LEVELS: WordLevelConfig[] = [
  { fallSpeed: 22, spawnInterval: 2200, maxWords: 3, baseScore: 8, lengthBias: 1 },
  { fallSpeed: 26, spawnInterval: 2000, maxWords: 3, baseScore: 10, lengthBias: 1.05 },
  { fallSpeed: 32, spawnInterval: 1900, maxWords: 4, baseScore: 12, lengthBias: 1.1 },
  { fallSpeed: 38, spawnInterval: 1800, maxWords: 4, baseScore: 14, lengthBias: 1.15 },
  { fallSpeed: 45, spawnInterval: 1650, maxWords: 4, baseScore: 16, lengthBias: 1.2 },
  { fallSpeed: 54, spawnInterval: 1500, maxWords: 5, baseScore: 18, lengthBias: 1.25 },
  { fallSpeed: 62, spawnInterval: 1400, maxWords: 5, baseScore: 20, lengthBias: 1.3 },
  { fallSpeed: 70, spawnInterval: 1300, maxWords: 5, baseScore: 22, lengthBias: 1.35 },
  { fallSpeed: 80, spawnInterval: 1200, maxWords: 6, baseScore: 24, lengthBias: 1.4 },
  { fallSpeed: 90, spawnInterval: 1100, maxWords: 6, baseScore: 26, lengthBias: 1.45 },
];

const GAME_DURATION = 120;
const TARGET_WORDS = 30;

const romajiOf = (entry: WordEntry) => entry.romaji_primary || generateRomaji(entry.reading).primary;

const WordRainGame: React.FC<Props> = ({ settings, active, words }) => {
  const level = useMemo(() => WORD_LEVELS[Math.floor(Math.random() * WORD_LEVELS.length)], []);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<WordFallingItem[]>([]);
  const [matchStates, setMatchStates] = useState<Record<string, MatchState>>({});
  const [targetId, setTargetId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missedWords, setMissedWords] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [speedFactor, setSpeedFactor] = useLocalStorage<number>('jp-word-speed', 1);
  const [spawned, setSpawned] = useState(0);

  // Effects state
  const [effectTrigger, setEffectTrigger] = useState(0);

  const { playOk, playCombo, playError, playLevel } = useAudio({
    enabled: settings.soundEnabled,
    volume: settings.volume,
  });

  const timerRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const filteredWords = useMemo(() => words, [words]);

  const accuracy = correct + mistakes === 0 ? 100 : Math.round((correct / (correct + mistakes)) * 100);
  const kpm = Math.round((correct / Math.max(1, GAME_DURATION - timeLeft)) * 60);

  const resetGame = () => {
    setItems([]);
    setMatchStates({});
    setTargetId(null);
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setMistakes(0);
    setMissedWords(0);
    setSpawned(0);
    setResultOpen(false);
    lastSpawnRef.current = 0;
    setPlaying(false);
    setHasStarted(false);
    setEffectTrigger(0);
  };

  const finishGame = () => {
    setPlaying(false);
    setResultOpen(true);
  };

  const spawnWord = () => {
    if (filteredWords.length === 0) return;
    setItems((prev) => {
      if (prev.length >= level.maxWords) return prev;
      if (spawned >= TARGET_WORDS) return prev;
      const entry = filteredWords[Math.floor(Math.random() * filteredWords.length)];
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const width = surfaceRef.current?.clientWidth ?? 900;
      const attempts = 10;
      let x = 40;
      for (let i = 0; i < attempts; i += 1) {
        const candidate = 30 + Math.random() * Math.max(60, width - 320);
        const tooClose = prev.some((p) => Math.abs(p.x - candidate) < 280);
        x = candidate;
        if (!tooClose) break;
      }
      const item: WordFallingItem = {
        id,
        entry,
        y: -40 - Math.random() * 60,
        x,
        speed: (level.fallSpeed + Math.random() * 8) * speedFactor,
        progress: 0,
        createdAt: performance.now(),
      };
      setMatchStates((prevMatch) => ({ ...prevMatch, [id]: createMatchState(entry.reading) }));
      setSpawned((s) => s + 1);
      return [...prev, item];
    });
  };

  useEffect(() => {
    if (!playing || !active) return;
    const height = surfaceRef.current?.clientHeight ?? 520;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      setTimeLeft((prev) => {
        const next = Math.max(0, prev - delta);
        if (next <= 0) finishGame();
        return next;
      });

      setItems((prev) => {
        const moved = prev
          .map((item) => ({
            ...item,
            y: item.y + item.speed * delta,
          }))
          .filter((item) => {
            if (item.y >= height - 30) {
              setCombo(0);
              setMatchStates((prevState) => {
                const next = { ...prevState };
                delete next[item.id];
                return next;
              });
              setTargetId((current) => (current === item.id ? null : current));
              setMissedWords((m) => {
                const next = m + 1;
                if (next >= 10) finishGame();
                return next;
              });
              return false;
            }
            return true;
          });

        if (spawned >= TARGET_WORDS && moved.length === 0) {
          finishGame();
        }
        return moved;
      });

      if (
        spawned < TARGET_WORDS &&
        now - lastSpawnRef.current > level.spawnInterval / speedFactor &&
        items.length < level.maxWords
      ) {
        spawnWord();
        lastSpawnRef.current = now;
      }

      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [playing, active, level.spawnInterval, level.maxWords, items.length, spawned, speedFactor]);

  const processKeyPress = (key: string) => {
    if (!playing) return;
    const normalized = key.toLowerCase();
    if (!/^[a-z']$/.test(normalized) && normalized !== 'backspace') return;

    const sorted = [...items].sort((a, b) => b.y - a.y);
    const candidateIds = targetId ? [targetId, ...sorted.map((i) => i.id)] : sorted.map((i) => i.id);

    for (const id of candidateIds) {
      const itemState = matchStates[id];
      if (!itemState) continue;
      const result = applyKeystroke(itemState, normalized, settings);
      if (result.status === 'error') {
        continue;
      }
      setMatchStates((prev) => ({ ...prev, [id]: result.state }));
      setTargetId(id);

      if (result.advanced) {
        setCorrect((c) => c + 1);
        setEffectTrigger(t => t + 1); // Trigger particle
      }

      if (result.status === 'completed') {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setMatchStates((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setScore((s) => s + level.baseScore + Math.floor(result.state.reading.length * level.lengthBias) + combo * 2);
        setCombo((c) => {
          const next = c + 1;
          setMaxCombo((m) => Math.max(m, next));
          if (next % 5 === 0) playCombo();
          else playOk();
          return next;
        });
      } else {
        playOk();
      }
      return;
    }

    setMistakes((m) => m + 1);
    setCombo(0);
    playError();
  };

  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Allow backspace to work normally if not focusing input (e.g. desktop)
      // but mobile input handles its own backspace via onChange
      const key = e.key.toLowerCase();
      if (!/^[a-z']$/.test(key) && key !== 'backspace') return;

      // If mobile input is focused, we let the onChange handle it to avoid double input
      if (document.activeElement === mobileInputRef.current && key !== 'backspace') {
        return;
      }

      e.preventDefault();
      processKeyPress(key);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, processKeyPress]);

  useEffect(() => {
    if (!active) return;
    resetGame();
    playLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, words]);

  const currentMatch = targetId ? matchStates[targetId] : null;
  const expected = currentMatch ? expectedNextChars(currentMatch, settings) : [];
  const progress = currentMatch ? Math.round(completionRatio(currentMatch) * 100) : 0;

  // Always keep focus on mobile input when playing
  useEffect(() => {
    if (active && mobileInputRef.current && playing) {
      mobileInputRef.current.focus();
    }
  }, [active, playing]);

  const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const lastChar = val.slice(-1);

    // Simplistic approach: just take the last character typed if length increased
    // If length decreased, it's a backspace
    if (val.length < mobileInput.length) {
      processKeyPress('backspace');
    } else if (val.length > mobileInput.length) {
      processKeyPress(lastChar);
    }

    // Keep only last 10 chars to prevent overflow/lag, but keep enough for backspacing context if needed
    if (val.length > 20) {
      setMobileInput(val.slice(-10));
    } else {
      setMobileInput(val);
    }
  };

  return (
    <div className="card">
      <div className="controls">
        <div className="flex" style={{ gap: 8 }}>
          <button
            className="icon-button"
            onClick={() => {
              resetGame();
              setPlaying(true);
              setHasStarted(true);
            }}
          >
            시작
          </button>
          <button
            className="icon-button ghost"
            onClick={() => {
              if (!hasStarted) return;
              setPlaying((p) => !p);
            }}
          >
            {playing ? '일시정지' : hasStarted ? '재개' : '일시정지'}
          </button>
          <button className="icon-button ghost" onClick={resetGame}>
            전체 리셋
          </button>
        </div>
        <div className="pill">남은 시간 {Math.round(timeLeft)}s / 놓친 단어 {missedWords}/10</div>
        <div className="flex" style={{ alignItems: 'center', gap: 6 }}>
          <span className="hint" style={{ minWidth: 40 }}>속도</span>
          <button className="icon-button ghost" onClick={() => setSpeedFactor((v) => Math.max(0.1, +(v - 0.1).toFixed(2)))}>
            -
          </button>
          <div className="badge">{speedFactor.toFixed(1)}x</div>
          <button className="icon-button ghost" onClick={() => setSpeedFactor((v) => Math.min(1.6, +(v + 0.1).toFixed(2)))}>
            +
          </button>
          <div className="hint" style={{ marginLeft: 8 }}>
            총 {TARGET_WORDS}개 / 남은 {Math.max(0, TARGET_WORDS - spawned)}
          </div>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`game-surface ${combo > 20 ? 'fever-mode' : ''}`}
        onClick={() => mobileInputRef.current?.focus()}
      >
        <EffectsLayer active={playing} spawnTrigger={effectTrigger} fever={combo > 20} />

        <div className="timer-bar">
          <span style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }} />
        </div>
        {items.map((item) => {
          const match = matchStates[item.id];
          const romaji = romajiOf(item.entry).toUpperCase();
          const typed = (match?.buffer || match?.lastRomaji || romaji).toUpperCase();
          return (
            <div
              key={item.id}
              className={`word-card ${targetId === item.id ? 'active' : ''}`}
              style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
            >
              <div className="word-display">{item.entry.display}</div>
              <div className="word-reading">{item.entry.reading}</div>
              <div className="hint">
                <span className="match-highlight">
                  {(match?.buffer || '').toUpperCase()}
                </span>
                <span style={{ opacity: 0.5 }}>
                  {romaji.slice((match?.buffer || '').length)}
                </span>
              </div>
              <div className="word-ko">{item.entry.ko}</div>
              <div className="progress">
                <span style={{ width: `${Math.round(completionRatio(match ?? createMatchState(item.entry.reading)) * 100)}%` }} />
              </div>
            </div>
          );
        })}

        {resultOpen && (
          <div className="result">
            <div className="result-card">
              <h3>라운드 종료</h3>
              <div className="stats-grid">
                <StatCard label="점수" value={score} />
                <StatCard label="정확도" value={`${accuracy}%`} />
                <StatCard label="최고 콤보" value={maxCombo} />
                <StatCard label="입력" value={`${correct} hit / ${mistakes} miss`} />
                <StatCard label="놓친 단어" value={missedWords} />
              </div>
              <div className="flex" style={{ marginTop: 24, justifyContent: 'center' }}>
                <button className="icon-button" onClick={resetGame}>
                  다시 시작
                </button>
                <button className="icon-button ghost" onClick={() => setResultOpen(false)}>
                  완료
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Mobile Input that covers the area */}
        <input
          ref={mobileInputRef}
          type="text"
          className="mobile-input"
          value={mobileInput}
          onChange={handleMobileInput}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      <div className="input-area">
        <span className="input-chip">타겟</span>
        <div className="hint" style={{ minWidth: 120 }}>
          {targetId
            ? items.find((w) => w.id === targetId)?.entry.display
            : '...'}
        </div>
        <div className="input-ghost" role="presentation" onClick={() => mobileInputRef.current?.focus()}>
          {(currentMatch?.buffer || currentMatch?.lastRomaji || '').toUpperCase() || ' '}
          <span className="caret" />
        </div>
      </div>

      <KeyboardOverlay expected={expected} visible={settings.keyboardGuide} />
    </div>
  );
};

export default WordRainGame;
