import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Coffee, Utensils, Cigarette, Clock, CheckCircle2, BellRing, Sparkles } from 'lucide-react';
import { playTimerCompletionChime, playSmokeBreakChime } from '../utils/sound';
import confetti from 'canvas-confetti';

interface BreakTimerProps {
  onLogBreakToShift?: (type: 'smoke' | 'rest' | 'lunch' | 'custom', durationMinutes: number, label: string) => void;
  defaultSmokeMinutes?: number;
  defaultRestMinutes?: number;
  defaultLunchMinutes?: number;
}

type BreakMode = 'smoke' | 'rest' | 'lunch' | 'custom';

export const BreakTimer: React.FC<BreakTimerProps> = ({
  onLogBreakToShift,
  defaultSmokeMinutes = 7,
  defaultRestMinutes = 15,
  defaultLunchMinutes = 30,
}) => {
  const [activeMode, setActiveMode] = useState<BreakMode>('smoke');
  const [totalSeconds, setTotalSeconds] = useState<number>(defaultSmokeMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(defaultSmokeMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [customInputMins, setCustomInputMins] = useState<number>(10);
  const [smokePreset, setSmokePreset] = useState<number>(defaultSmokeMinutes);
  const [soundTested, setSoundTested] = useState<boolean>(false);

  const endTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Set preset
  const selectMode = (mode: BreakMode, minutes?: number) => {
    setIsRunning(false);
    setIsCompleted(false);
    setActiveMode(mode);

    let mins = 15;
    if (mode === 'smoke') mins = minutes ?? smokePreset;
    else if (mode === 'rest') mins = defaultRestMinutes;
    else if (mode === 'lunch') mins = defaultLunchMinutes;
    else if (mode === 'custom') mins = minutes ?? customInputMins;

    const secs = mins * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
  };

  // Timer loop with Date.now() to prevent background drift
  useEffect(() => {
    if (isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + remainingSeconds * 1000;
      }

      timerIntervalRef.current = window.setInterval(() => {
        if (!endTimeRef.current) return;
        const now = Date.now();
        const diff = Math.ceil((endTimeRef.current - now) / 1000);

        if (diff <= 0) {
          setRemainingSeconds(0);
          setIsRunning(false);
          setIsCompleted(true);
          endTimeRef.current = null;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          // Play Sound
          if (activeMode === 'smoke') {
            playSmokeBreakChime();
          } else {
            playTimerCompletionChime();
          }

          // Trigger Cellphone Vibration & Browser Notification
          try {
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200, 100, 400]);
            }
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('ChronoShift Break Over!', {
                  body: `Your ${activeMode} break timer has finished. Time to get back to work!`,
                  icon: '/favicon.ico',
                });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    new Notification('ChronoShift Break Over!', {
                      body: `Your ${activeMode} break timer has finished. Time to get back to work!`,
                    });
                  }
                });
              }
            }
          } catch {
            // ignore
          }

          // Trigger Confetti
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
            });
          } catch {
            // ignore
          }
        } else {
          setRemainingSeconds(diff);
        }
      }, 250);
    } else {
      endTimeRef.current = null;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning, activeMode]);

  const handleStart = () => {
    if (remainingSeconds <= 0) {
      setRemainingSeconds(totalSeconds);
      endTimeRef.current = Date.now() + totalSeconds * 1000;
    } else {
      endTimeRef.current = Date.now() + remainingSeconds * 1000;
    }
    setIsCompleted(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    endTimeRef.current = null;
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    endTimeRef.current = null;
    setRemainingSeconds(totalSeconds);
  };

  const handleTestSound = () => {
    setSoundTested(true);
    if (activeMode === 'smoke') {
      playSmokeBreakChime();
    } else {
      playTimerCompletionChime();
    }
    setTimeout(() => setSoundTested(false), 2000);
  };

  const handleLogToTimesheet = () => {
    if (!onLogBreakToShift) return;
    const mins = Math.round(totalSeconds / 60);
    const label =
      activeMode === 'smoke'
        ? `Smoke Break (${mins}m)`
        : activeMode === 'rest'
        ? `Rest Break (${mins}m)`
        : activeMode === 'lunch'
        ? `Lunch (${mins}m)`
        : `Custom Break (${mins}m)`;

    onLogBreakToShift(activeMode, mins, label);
    setIsCompleted(false);
    handleReset();
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const strokeDashoffset = 440 - (440 * progressPercent) / 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors">
      {/* Header with Title and Sound Test */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Break &amp; Smoke Timer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audio chime alert &bull; 15m rest every 4h &bull; 30m lunch
            </p>
          </div>
        </div>

        {/* Audio Chime Test Button */}
        <button
          onClick={handleTestSound}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            soundTested
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Test timer audio alert sound"
        >
          <Volume2 className={`w-3.5 h-3.5 ${soundTested ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
          <span>{soundTested ? 'Playing Chime!' : 'Test Sound'}</span>
        </button>
      </div>

      {/* Break Mode Presets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {/* Smoke Break Button */}
        <button
          onClick={() => selectMode('smoke')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
            activeMode === 'smoke'
              ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5">
            <Cigarette className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Smoke Break</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {smokePreset} mins
          </span>
        </button>

        {/* 15m Rest Break Button */}
        <button
          onClick={() => selectMode('rest')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
            activeMode === 'rest'
              ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-1.5">
            <Coffee className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">15m Rest Break</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Every 4 hours
          </span>
        </button>

        {/* 30m Lunch Button */}
        <button
          onClick={() => selectMode('lunch')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
            activeMode === 'lunch'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
            <Utensils className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">30m Lunch</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Meal deduction
          </span>
        </button>

        {/* Custom Timer */}
        <button
          onClick={() => selectMode('custom')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
            activeMode === 'custom'
              ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Custom Timer</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {customInputMins} mins
          </span>
        </button>
      </div>

      {/* Sub-presets for Smoke or Custom */}
      {activeMode === 'smoke' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Smoke Duration:</span>
          {[5, 7, 10].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setSmokePreset(mins);
                selectMode('smoke', mins);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                smokePreset === mins
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {mins} min
            </button>
          ))}
        </div>
      )}

      {activeMode === 'custom' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Minutes:</span>
          <input
            type="number"
            min="1"
            max="180"
            value={customInputMins}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              setCustomInputMins(val);
              selectMode('custom', val);
            }}
            className="w-16 px-2 py-1 text-center font-bold text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-purple-500"
          />
          {[10, 20, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => {
                setCustomInputMins(m);
                selectMode('custom', m);
              }}
              className="px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
            >
              {m}m
            </button>
          ))}
        </div>
      )}

      {/* Main Countdown Display with Circular Ring */}
      <div className="flex flex-col items-center justify-center my-3">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* SVG Progress Ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r="70"
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Progress ring */}
            <circle
              cx="80"
              cy="80"
              r="70"
              className={`transition-all duration-300 ${
                activeMode === 'smoke'
                  ? 'stroke-amber-500'
                  : activeMode === 'rest'
                  ? 'stroke-sky-500'
                  : activeMode === 'lunch'
                  ? 'stroke-emerald-500'
                  : 'stroke-purple-500'
              }`}
              strokeWidth="10"
              strokeDasharray="440"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Centered Digital Display */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            {isCompleted ? (
              <div className="flex flex-col items-center animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-1" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Break Finished!
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Audio chime sounded
                </span>
              </div>
            ) : (
              <>
                <span className="text-4xl sm:text-5xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                  {activeMode === 'smoke'
                    ? 'Smoke Break'
                    : activeMode === 'rest'
                    ? '15m Rest Break'
                    : activeMode === 'lunch'
                    ? '30m Lunch Break'
                    : 'Custom Break'}
                </span>
                {isRunning && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Timer Running
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 mt-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md transition active:scale-95 ${
                activeMode === 'smoke'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                  : activeMode === 'rest'
                  ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/20'
                  : activeMode === 'lunch'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{remainingSeconds < totalSeconds && remainingSeconds > 0 ? 'Resume' : 'Start Break'}</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-md transition active:scale-95"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Completed Alert & Log to Timesheet Option */}
        {isCompleted && onLogBreakToShift && (
          <div className="mt-5 w-full max-w-sm p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col items-center text-center animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Break is complete!</span>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400 mb-3">
              Would you like to record this {Math.round(totalSeconds / 60)}-minute break into today's timesheet?
            </p>
            <button
              onClick={handleLogToTimesheet}
              className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition active:scale-95"
            >
              + Log to Today's Timesheet
            </button>
          </div>
        )}
      </div>

      {/* Break Rule Guide Banner */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Work &amp; Rest Break Guidelines:
            </span>{' '}
            Labor guidelines generally recommend a <strong>15-minute paid rest break every 4 hours worked</strong>, and a <strong>30-minute unpaid meal/lunch break</strong> for shifts longer than 5 or 6 hours. Smoke breaks are tracked for your convenience.
          </div>
        </div>
      </div>
    </div>
  );
};
