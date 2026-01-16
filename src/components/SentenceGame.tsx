import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { GameSettings, MatchState, SentenceEntry, SentenceSegment } from '../types';
import { applyKeystroke, createMatchState, expectedNextChars, completionRatio } from '../utils/romanizer';
import StatCard from './StatCard';
import KeyboardOverlay from './KeyboardOverlay';
import { useAudio } from '../hooks/useAudio';

interface Props {
  settings: GameSettings;
  active: boolean;
  sentences: SentenceEntry[];
}

const splitIntoSegments = (entry: SentenceEntry): SentenceSegment[] => {
  const splitter = /(?<=[。．\.！？!?])/;
  const jpParts = entry.text.split(splitter).filter(Boolean);
  const rdParts = entry.reading.split(splitter).filter(Boolean);
  const segments: SentenceSegment[] = [];
  const max = Math.max(jpParts.length, rdParts.length);
  for (let i = 0; i < max; i += 1) {
    segments.push({
      jp: jpParts[i] ?? '',
      reading: rdParts[i] ?? '',
    });
  }
  return segments.length ? segments : [{ jp: entry.text, reading: entry.reading }];
};

const SentenceGame: React.FC<Props> = ({ settings, active, sentences }) => {
  const pool = useMemo(() => sentences, [sentences]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [segments, setSegments] = useState<SentenceSegment[]>([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [match, setMatch] = useState<MatchState>(createMatchState(''));
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number>(performance.now());
  const [finished, setFinished] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showJP, setShowJP] = useState(true);
  const [showKO, setShowKO] = useState(true);
  const [mobileInput, setMobileInput] = useState('');
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const { playOk, playError, playCombo, playLevel } = useAudio({
    enabled: settings.soundEnabled,
    volume: settings.volume,
  });

  const currentEntry = pool[currentIndex];

  useEffect(() => {
    if (!pool.length) return;
    const idx = Math.max(0, Math.min(currentIndex, pool.length - 1));
    const entry = pool[idx];
    const segs = splitIntoSegments(entry);
    setCurrentIndex(idx);
    setSegments(segs);
    setSegmentIndex(0);
    setMatch(createMatchState(segs[0]?.reading ?? ''));
    setCorrect(0);
    setMistakes(0);
    setFinished(false);
    setPlaying(false);
    setStartTime(performance.now());
  }, [pool, currentIndex]);

  const startEntry = () => {
    if (!pool.length) return;
    setCorrect(0);
    setMistakes(0);
    setFinished(false);
    setPlaying(true);
    setStartTime(performance.now());
    playLevel();
  };

  const processKeyPress = useCallback((key: string) => {
    if (!active || finished || !playing) return;
    const normalized = key.toLowerCase();
    if (!/^[a-z']$/.test(normalized) && normalized !== 'backspace') return;

    // Use a ref or functional update carefully. 
    // Since we need access to 'segments' and 'segmentIndex', we should include them in deps 
    // OR use a different strategy. 
    // Simplest is to NOT use functional update for 'match' if we rely on other state, 
    // but here we are inside a callback that depends on 'match' implicitly via closure if not careful.
    // Actually, let's just use the current 'match' from scope since we are in a useCallback with proper deps.

    const result = applyKeystroke(match, normalized, settings);

    if (result.status === 'error') {
      setMistakes((m) => m + 1);
      playError();
      return;
    }

    if (result.advanced) setCorrect((c) => c + 1);

    if (result.status === 'completed') {
      playCombo();
      const nextSegment = segmentIndex + 1;
      if (nextSegment < segments.length) {
        setSegmentIndex(nextSegment);
        setMatch(createMatchState(segments[nextSegment].reading));
      } else {
        // Last segment completed with this keystroke
        setFinished(true);
        setPlaying(false);
        setMatch(result.state); // Just to show full text
      }
    } else {
      playOk();
      setMatch(result.state);
    }
  }, [active, finished, playing, settings, match, segmentIndex, segments, playOk, playError, playCombo]);

  // Removed broken useEffect for match.isComplete


  useEffect(() => {
    if (!active || !playing) return;

    const handleKey = (e: KeyboardEvent) => {
      if (!active || finished) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (!/^[a-z']$/.test(key) && key !== 'backspace') return;

      if (document.activeElement === mobileInputRef.current && key !== 'backspace') {
        return;
      }

      e.preventDefault();
      // Pass the key to a handler that uses the latest state
      // We can't easily use the callback above because of closure staleness if we don't include all deps
      // But we did include dependencies.
      processKeyPress(key);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, playing, finished, processKeyPress]);

  // Mobile Input Handler
  const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length < mobileInput.length) {
      processKeyPress('backspace');
    } else if (val.length > mobileInput.length) {
      processKeyPress(val.slice(-1));
    }
    if (val.length > 20) setMobileInput(val.slice(-10));
    else setMobileInput(val);
  };

  if (pool.length === 0) {
    return <div className="card">문장 데이터가 없습니다. JSON import 후 다시 시도하세요.</div>;
  }

  const accuracy = correct + mistakes === 0 ? 100 : Math.round((correct / (correct + mistakes)) * 100);
  const elapsedSec = Math.max(1, (performance.now() - startTime) / 1000);
  const wpm = Math.round((correct / 5 / elapsedSec) * 60);
  const expected = expectedNextChars(match, settings);
  const progress = Math.round(((segmentIndex + completionRatio(match)) / segments.length) * 100);

  useEffect(() => {
    if (active && mobileInputRef.current && playing) {
      mobileInputRef.current.focus();
    }
  }, [active, playing]);

  return (
    <div className="card">
      <div className="controls">
        <div className="pill">문장 연습</div>
        <button className="icon-button" onClick={startEntry}>
          시작/리셋
        </button>
        <div className="flex">
          <button className="icon-button ghost" onClick={() => setShowJP((v) => !v)}>
            {showJP ? 'JP 숨기기' : 'JP 보이기'}
          </button>
          <button className="icon-button ghost" onClick={() => setShowKO((v) => !v)}>
            {showKO ? 'KO 숨기기' : 'KO 보이기'}
          </button>
          <select
            className="icon-button"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
            value={currentEntry?.id}
            onChange={(e) => {
              const idx = pool.findIndex((p) => p.id === e.target.value);
              setCurrentIndex(idx >= 0 ? idx : 0);
            }}
          >
            {pool.map((s, idx) => (
              <option key={s.id ?? idx} value={s.id}>
                {s.title_kana ? `${s.title_kana} / ${s.title_kanji ?? ''}` : s.text.slice(0, 20)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: 12 }}>
        <StatCard label="정확도" value={`${accuracy}%`} danger={accuracy < 85} />
        <StatCard label="WPM" value={wpm} hint="5자 단위" />
        <StatCard label="현재 구간" value={`${segmentIndex + 1} / ${segments.length}`} />
        <StatCard label="입력" value={`${correct} hit / ${mistakes} miss`} />
      </div>

      <div className="sentence-container" style={{ marginTop: 24 }}>
        <div className="sentence-card">
          {showJP && (
            <div className="sentence-text">
              {segments.map((seg, idx) => (
                <span key={idx} className={idx === segmentIndex ? 'segment-highlight' : ''}>
                  {seg.jp}
                </span>
              ))}
            </div>
          )}
          {settings.showFurigana && (
            <div className="sentence-reading" style={{ marginTop: 8 }}>
              {segments.map((seg, idx) => (
                <span key={idx} className={idx === segmentIndex ? 'segment-highlight' : ''}>
                  {seg.reading}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="sentence-card" onClick={() => mobileInputRef.current?.focus()}>
          <div className="hint">로마자 입력 / 읽기 기준</div>
          <div className="sentence-text match-highlight" style={{ marginTop: 6, fontSize: 24 }}>
            {segments[segmentIndex]?.reading || ''}
          </div>
          {showKO && (
            <div className="sentence-ko" style={{ marginTop: 6 }}>
              {currentEntry.ko}
            </div>
          )}
          <div className="progress" style={{ marginTop: 16 }}>
            <span style={{ width: `${progress}%` }} />
          </div>
          {settings.romajiHint && (
            <div className="hint" style={{ marginTop: 8 }}>
              다음 키: {expected.join(' / ') || '...'}
            </div>
          )}
          <div className="input-area" style={{ marginTop: 16 }}>
            <span className="input-chip">입력</span>
            <div className="input-ghost" role="presentation">
              {(match.buffer || '').toUpperCase() || ' '}
              <span className="caret" />
            </div>
            <input
              ref={mobileInputRef}
              type="text"
              className="mobile-input"
              value={mobileInput}
              onChange={handleMobileInput}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="모바일에서 여기를 탭하고 입력"
            />
          </div>
        </div>
      </div>

      {finished && (
        <div className="result" aria-live="polite">
          <div className="result-card">
            <h3>문장 연습 완료</h3>
            <div className="stats-grid">
              <StatCard label="정확도" value={`${accuracy}%`} />
              <StatCard label="WPM" value={wpm} />
              <StatCard label="총 입력" value={`${correct} hit / ${mistakes} miss`} />
            </div>
            <div className="flex" style={{ marginTop: 24, justifyContent: 'center' }}>
              <button className="icon-button" onClick={startEntry}>
                다시 시작
              </button>
              <button className="icon-button ghost" onClick={() => setFinished(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <KeyboardOverlay expected={expected} visible={settings.keyboardGuide} />
    </div>
  );
};

export default SentenceGame;
