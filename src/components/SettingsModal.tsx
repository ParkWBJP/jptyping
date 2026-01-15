import React, { useEffect, useState } from 'react';
import { GameSettings } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onChange: (value: GameSettings) => void;
  onReset: () => void;
}

const SettingsModal: React.FC<Props> = ({ open, onClose, settings, onChange, onReset }) => {
  const [draft, setDraft] = useState<GameSettings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  const handleToggle = (key: keyof GameSettings) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNumber = (key: keyof GameSettings, value: number) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="modal">
        <div className="controls" style={{ justifyContent: 'space-between' }}>
          <h2>설정</h2>
          <button className="icon-button ghost" onClick={onClose} aria-label="닫기">
            ✕ 닫기
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div>효과음</div>
            <div className="hint">Web Audio로 짧은 비프음</div>
          </div>
          <div className="flex" style={{ alignItems: 'center' }}>
            <input
              className="range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.volume}
              onChange={(e) => handleNumber('volume', Number(e.target.value))}
            />
            <div
              className={`switch ${draft.soundEnabled ? 'on' : ''}`}
              onClick={() => handleToggle('soundEnabled')}
              role="switch"
              aria-checked={draft.soundEnabled}
            />
          </div>
        </div>

        <div className="setting-row">
          <div>로마자 힌트</div>
          <div
            className={`switch ${draft.romajiHint ? 'on' : ''}`}
            onClick={() => handleToggle('romajiHint')}
            role="switch"
            aria-checked={draft.romajiHint}
          />
        </div>

        <div className="setting-row">
          <div>키보드 가이드</div>
          <div
            className={`switch ${draft.keyboardGuide ? 'on' : ''}`}
            onClick={() => handleToggle('keyboardGuide')}
            role="switch"
            aria-checked={draft.keyboardGuide}
          />
        </div>

        <div className="setting-row">
          <div>촉음(っ) 직접 입력 허용(ltu/xtu)</div>
          <div
            className={`switch ${draft.allowExplicitSmallTsu ? 'on' : ''}`}
            onClick={() => handleToggle('allowExplicitSmallTsu')}
            role="switch"
            aria-checked={draft.allowExplicitSmallTsu}
          />
        </div>

        <div className="setting-row">
          <div>백스페이스</div>
          <div
            className={`switch ${draft.allowBackspace ? 'on' : ''}`}
            onClick={() => handleToggle('allowBackspace')}
            role="switch"
            aria-checked={draft.allowBackspace}
          />
        </div>

        <div className="setting-row">
          <div>후리가나 표시</div>
          <div
            className={`switch ${draft.showFurigana ? 'on' : ''}`}
            onClick={() => handleToggle('showFurigana')}
            role="switch"
            aria-checked={draft.showFurigana}
          />
        </div>

        <div className="setting-row">
          <div>데이터 리셋 (통계/로컬 저장)</div>
          <button className="icon-button" onClick={onReset}>
            초기화
          </button>
        </div>

        <div className="controls" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="icon-button" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
