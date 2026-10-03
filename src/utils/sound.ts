/**
 * Audio synthesizers using Web Audio API.
 * 100% offline, zero latency, no external mp3 files required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTimerCompletionChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Harmonic bell sequence: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), E6 (1318.51Hz)
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.6 },
      { freq: 830.61, time: 0.15, dur: 0.7 },
      { freq: 987.77, time: 0.3, dur: 0.8 },
      { freq: 1318.51, time: 0.45, dur: 1.2 },
    ];

    const now = ctx.currentTime;

    notes.forEach((note) => {
      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sine wave with slight triangle shimmer for bell-like tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.35, now + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.05);

      // Bell overtone
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(note.freq * 2.76, now + note.time); // bell metallic overtone
      overtoneGain.gain.setValueAtTime(0, now + note.time);
      overtoneGain.gain.linearRampToValueAtTime(0.08, now + note.time + 0.01);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur * 0.4);

      overtone.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtone.start(now + note.time);
      overtone.stop(now + note.time + note.dur * 0.45);
    });

    // Mobile vibration pattern if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 250, 100, 400]);
      } catch {
        // Ignore if denied
      }
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

export function playSmokeBreakChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.5 }, // C5
      { freq: 659.25, time: 0.15, dur: 0.5 }, // E5
      { freq: 783.99, time: 0.3, dur: 0.8 }, // G5
    ];

    const now = ctx.currentTime;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);
      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.3, now + note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);
    });

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Audio error:', err);
  }
}

export function playButtonTapSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // Ignore
  }
}
