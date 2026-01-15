import { useEffect, useMemo } from 'react';

interface Options {
  enabled: boolean;
  volume: number;
}

const typewriter = (context: AudioContext, volume = 0.3) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = 1700;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.09);
};

const beep = (context: AudioContext, frequency: number, duration = 0.1, volume = 0.2) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
};

export const useAudio = ({ enabled, volume }: Options) => {
  const ctx = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new AudioContext();
  }, []);

  useEffect(() => {
    if (!ctx) return;
    const resume = () => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [ctx]);

  useEffect(() => {
    return () => {
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => undefined);
      }
    };
  }, [ctx]);

  return {
    playOk: () => {
      if (!enabled || !ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      typewriter(ctx, volume * 0.8);
    },
    playCombo: () => {
      if (!enabled || !ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      beep(ctx, 880, 0.12, volume * 0.9);
    },
    playError: () => {
      if (!enabled || !ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      beep(ctx, 200, 0.1, volume * 0.9);
    },
    playLevel: () => {
      if (!enabled || !ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      beep(ctx, 520, 0.16, volume * 0.9);
    },
  };
};
