import { useEffect, useRef, useState } from 'react';
import { sampleAudioClock } from './day24AudioClock';
import { writeMetronome } from './day24Metronome';
import { createReturnTiming, recordReturnTiming } from './day24ReturnTiming';

// Trial timing in complete 3/4 measures, after the opening pickup.
const LISTEN_MEASURES = 8;
const START_LEAD_SECONDS = 0.15;
// A one-frame cue can be lost when video and page compositing miss that frame.
const FLASH_VISIBLE_MS = 34;

export default function useDay24Rhythm(videoRef, visualCueRef) {
  const session = useRef({ generation: 0, context: null, source: null, frame: 0, assets: null });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tapDeltaMs, setTapDeltaMs] = useState(null);
  const [tapTiming, setTapTiming] = useState(null);
  const [returnTiming, setReturnTiming] = useState(createReturnTiming);
  const [tapAverage, setTapAverage] = useState({ count: 0, meanMs: 0 });

  function stop() {
    const state = session.current;
    state.generation += 1;
    state.starting = false;
    setTapDeltaMs(null);
    setTapTiming(null);
    cancelAnimationFrame(state.frame);
    if (state.source) {
      state.source.onended = null;
      state.source.stop();
      state.source.disconnect();
      state.source = null;
    }
    state.gain?.disconnect();
    state.round = null;
    videoRef.current?.pause();
    visualCueRef.current?.style.setProperty('--beat-glow', '0');
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const read = async (url, type) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('No se pudo cargar la música.');
      return response[type]();
    };
    Promise.all([
      read('/audio/day24/anton-celesta.wav', 'arrayBuffer'),
      read('/audio/day24/anton-timing.json', 'json'),
    ]).then(([bytes, timing]) => {
      if (!active) return;
      session.current.assets = { bytes, timing };
      setStatus('ready');
    }).catch(reason => {
      if (!active || reason.name === 'AbortError') return;
      setError('No se pudo cargar la música. Vuelve a abrir la cajita para reintentar.');
      setStatus('error');
    });
    const hide = () => {
      if (document.hidden && (session.current.round || session.current.starting)) {
        stop();
        setResult(null);
        setStatus('ready');
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      active = false;
      controller.abort();
      document.removeEventListener('visibilitychange', hide);
      stop();
      const context = session.current.context;
      if (context) {
        context.onstatechange = null;
        context.close().catch(() => {});
        session.current.context = null;
      }
    };
  }, []);

  // Map the input event's monotonic timestamp to the audio being heard, rather
  // than to the next render quantum or an animation frame. Fallback is estimated.
  function heardTime(performanceMs = performance.now()) {
    return sampleAudioClock(session.current.context, performanceMs, performance.now(),
      session.current.resumedAt || 0).at;
  }

  async function start({ speed = 1, silentMeasures = 4, metronome = false, visualOnly = false } = {}) {
    const rate = Math.min(1.5, Math.max(0.5, speed));
    const silence = Math.min(7, Math.max(1, Math.round(silentMeasures)));
    const state = session.current;
    if (!state.assets) return;
    stop();
    const generation = state.generation;
    state.starting = true;
    setError('');
    setResult(null);
    setTapAverage({ count: 0, meanMs: 0 });
    setReturnTiming(createReturnTiming());
    setStatus('starting');
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Este navegador no permite reproducir la música.');
      const context = state.context || new AudioContextClass({ latencyHint: 'interactive' });
      state.context = context;
      // Both calls happen directly within the start gesture for iPhone access.
      const resume = context.resume();
      const video = videoRef.current;
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0;
      video.playbackRate = rate;
      const videoPlay = video.play();
      const decoded = state.buffer ? Promise.resolve(state.buffer)
        : context.decodeAudioData(state.assets.bytes.slice(0));
      const [, , buffer] = await Promise.all([resume, videoPlay, decoded]);
      if (state.generation !== generation) return;
      if (context.state !== 'running') throw new Error('No se pudo iniciar el sonido. Inténtalo de nuevo.');
      state.buffer = buffer;
      state.starting = false;
      state.resumedAt = performance.now();
      const timing = state.assets.timing;
      const beat = 60 / timing.tempoBpm / rate;
      const measure = beat * timing.timeSignature[0];
      const pickup = timing.measures[0].durationMs / 1000 / rate;
      const muteAt = pickup + LISTEN_MEASURES * measure;
      const returnAt = muteAt + silence * measure;
      const startAt = context.currentTime + START_LEAD_SECONDS;
      const source = context.createBufferSource();
      const gain = context.createGain();
      if (metronome || visualOnly) {
        const clicks = context.createBuffer(1, buffer.length, buffer.sampleRate);
        if (!visualOnly) writeMetronome(clicks.getChannelData(0), buffer.sampleRate, timing.tempoBpm, timing.totalDurationMs / 1000);
        source.buffer = clicks;
      } else source.buffer = buffer;
      source.playbackRate.value = rate;
      source.connect(gain);
      gain.connect(context.destination);
      // Gain automation never pauses the source clock. A short fade before the
      // cut avoids clicks; the return begins exactly on the scheduled beat.
      gain.gain.setValueAtTime(1, startAt);
      gain.gain.setValueAtTime(1, startAt + muteAt - 0.008);
      gain.gain.linearRampToValueAtTime(0, startAt + muteAt);
      gain.gain.setValueAtTime(0, startAt + returnAt);
      gain.gain.linearRampToValueAtTime(1, startAt + returnAt + 0.003);
      state.source = source;
      state.gain = gain;
      state.round = { startAt, muteAt, returnAt, beat, closest: null, lastTap: -Infinity, scored: false,
        returnTiming: createReturnTiming(), visualOnly, visualStart: performance.now() + START_LEAD_SECONDS * 1000, flashes: [], lastFlash: -1 };
      context.onstatechange = () => {
        if (state.round && context.state !== 'running') {
          stop();
          setResult(null);
          setStatus('ready');
        }
      };
      source.onended = () => {
        if (state.generation !== generation) return;
        stop();
        setStatus('ended');
      };
      source.start(startAt);
      setStatus('playing');
      const animate = () => {
        const round = state.round;
        if (!round || state.generation !== generation) return;
        const now = performance.now();
        const position = visualOnly ? (now - round.visualStart) / 1000 : heardTime() - startAt;
        const beatIndex = Math.floor(position / beat);
        const inPiece = position >= 0 && position < timing.totalDurationMs / 1000 / rate;
        const silent = position >= muteAt && position < returnAt;
        const flashThisFrame = inPiece && !silent && beatIndex > round.lastFlash;
        if (flashThisFrame) {
          round.lastFlash = beatIndex;
          round.flashes.push(now);
        }
        // Keep the original onset as the timing reference. Only extend visibility;
        // do not shift subsequent beats or replay skipped beats in a burst.
        const flashVisible = inPiece && !silent && now - (round.flashes.at(-1) ?? -Infinity) < FLASH_VISIBLE_MS;
        visualCueRef.current?.style.setProperty('--beat-glow', flashVisible ? '1' : '0');
        // Allow one half-beat either side, plus a little event-delivery grace.
        if (!visualOnly && !round.scored && position > returnAt + beat / 2 + 0.15) {
          round.scored = true;
          setResult(round.closest === null ? { missed: true } : { deltaMs: Math.round(round.closest * 1000) });
        }
        state.frame = requestAnimationFrame(animate);
      };
      state.frame = requestAnimationFrame(animate);
    } catch (reason) {
      if (state.generation !== generation) return;
      stop();
      setStatus('ready');
      setError(reason.name === 'NotAllowedError'
        ? 'No se pudo iniciar la reproducción. Toca reproducir para reintentar.'
        : 'No se pudo iniciar la cajita musical. Inténtalo de nuevo.');
    }
  }

  function reset() {
    stop();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setResult(null);
    setError('');
    setStatus('ready');
  }

  function tap(event) {
    const round = session.current.round;
    if (!round || session.current.context.state !== 'running') return;
    const stamp = event.timeStamp > 1e12 ? event.timeStamp - performance.timeOrigin : event.timeStamp;
    let at, offsetMs;
    if (round.visualOnly) {
      // Past cues use the frame in which we requested the visible flash.
      // An early tap uses the next scheduled cue; display scanout adds at most
      // ordinary frame-level uncertainty, not an audio latency adjustment.
      // During silence the beat clock continues even though cues are hidden.
      const nextIndex = Math.max(round.lastFlash + 1,
        Math.round((stamp - round.visualStart) / (round.beat * 1000)));
      const nextCue = round.visualStart + nextIndex * round.beat * 1000;
      const candidates = [...round.flashes.slice(-3), nextCue];
      const nearestCue = candidates.reduce((best, cue) =>
        Math.abs(stamp - cue) < Math.abs(stamp - best) ? cue : best);
      offsetMs = stamp - nearestCue;
      setTapTiming({ method: 'visual', eventDelayMs: Math.round(performance.now() - stamp) });
    } else {
      const reading = sampleAudioClock(session.current.context, stamp, performance.now(), session.current.resumedAt || 0);
      at = reading.at - round.startAt;
      setTapTiming(reading);
      const nearestBeat = Math.max(0, Math.round(at / round.beat)) * round.beat;
      offsetMs = (at - nearestBeat) * 1000;
    }
    setTapDeltaMs(Math.round(offsetMs));
    setTapAverage(previous => ({ count: previous.count + 1,
      meanMs: previous.meanMs + (offsetMs - previous.meanMs) / (previous.count + 1) }));
    if (round.visualOnly) return;
    recordReturnTiming(round.returnTiming, at, round);
    setReturnTiming({ ...round.returnTiming });
    if (round.scored) return;
    // Ignore duplicate/very rapid inputs without moving the refractory window.
    if (at - round.lastTap < round.beat * 0.45) return;
    round.lastTap = at;
    const difference = at - round.returnAt;
    if (Math.abs(difference) <= round.beat / 2
      && (round.closest === null || Math.abs(difference) < Math.abs(round.closest))) {
      round.closest = difference;
    }
  }

  return { status, error, result, tapDeltaMs, tapTiming, tapAverage, returnTiming, start, tap, reset };
}
