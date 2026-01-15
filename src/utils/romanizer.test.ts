import { applyKeystroke, createMatchState } from './romanizer';
import { GameSettings } from '../types';

const settings: GameSettings = {
  soundEnabled: false,
  volume: 0.3,
  romajiHint: true,
  keyboardGuide: true,
  wordDifficulty: 3,
  sentenceDifficulty: 1,
  showFurigana: false,
  theme: 'dark',
  allowExplicitSmallTsu: true,
  allowBackspace: true,
};

const typeWord = (reading: string, inputs: string[]) => {
  let state = createMatchState(reading);
  let status = 'progress';
  inputs.forEach((key) => {
    const res = applyKeystroke(state, key, settings);
    state = res.state;
    status = res.status;
  });
  return status;
};

describe('romanizer', () => {
  it('accepts multiple romaji for し', () => {
    expect(typeWord('し', ['s', 'h', 'i'])).toBe('completed');
    expect(typeWord('し', ['s', 'i'])).toBe('completed');
  });

  it('handles small tsu by double consonant', () => {
    expect(typeWord('きって', ['k', 'i', 't', 't', 'e'])).toBe('completed');
  });

  it('requires safer n before vowel', () => {
    let state = createMatchState('んあ');
    let res = applyKeystroke(state, 'n', settings);
    state = res.state;
    res = applyKeystroke(state, 'a', settings);
    expect(res.status).toBe('error'); // single n before vowel should fail

    state = createMatchState('んあ');
    res = applyKeystroke(state, 'n', settings);
    state = res.state;
    res = applyKeystroke(state, 'n', settings);
    state = res.state;
    expect(applyKeystroke(state, 'a', settings).status).toBe('completed');
  });

  it('handles long vowel mark', () => {
    expect(typeWord('こーひー', ['k', 'o', 'o', 'h', 'i', 'i'])).toBe('completed');
  });

  it('supports youon patterns', () => {
    expect(typeWord('きゃ', ['k', 'y', 'a'])).toBe('completed');
  });
});
