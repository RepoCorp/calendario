import { useEffect, useRef, useState } from 'react';
import '../components/Day16Layout.css';
import Day16Message from '../components/Day16Message';

const SPOTS = [
  { id: 'hat', label: 'sombrero', laugh: 'ji ji', audio: '/sounds/snowman-hat.mp3', className: 'day16-spot-hat' },
  { id: 'nose', label: 'nariz', laugh: 'ja ja', audio: '/sounds/snowman-nose.mp3', className: 'day16-spot-nose' },
  { id: 'scarf', label: 'bufanda', laugh: 'je je', audio: '/sounds/snowman-scarf.mp3', className: 'day16-spot-scarf' },
  { id: 'button', label: 'boton', laugh: 'jo jo', audio: '/sounds/snowman-button.mp3', className: 'day16-spot-button' },
];

const getSpot = (id) => SPOTS.find((spot) => spot.id === id);
const REVEAL_ROUND = 6;
// Snow reveal experiments are paused; keep normal memory-game rules active.
const ALLOW_TEST_MISTAKES = false;
const TEST_MELT_ON_TAP = false;
const SNOWMAN_IMAGE = '/images/day16-realistic-snowman.png';

export default function Day16() {
  const stageRef = useRef(null);
  const [snowmanScale, setSnowmanScale] = useState(1);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const audioContextRef = useRef(null);
  const soundPlayersRef = useRef(new Map());
  const timersRef = useRef([]);
  const [sequence, setSequence] = useState([]);
  const [answerIndex, setAnswerIndex] = useState(0);
  const [activeSpot, setActiveSpot] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const getAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = context;
    context.resume?.();
    return context;
  };

  const playLaugh = (spot) => {
    let player = soundPlayersRef.current.get(spot.id);
    if (!player) {
      player = new Audio(spot.audio);
      player.preload = 'auto';
      soundPlayersRef.current.set(spot.id, player);
    }

    player.currentTime = 0;
    player.play().catch(() => {});
  };

  const playLossSound = () => {
    const context = getAudioContext();
    if (!context) return;

    const start = context.currentTime;
    const notes = [220, 156];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const offset = index * 0.12;

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, start + offset);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, start + offset + 0.1);
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.06, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.11);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.13);
    });
  };

  const lightSpot = (spot) => {
    setActiveSpot(spot.id);
    playLaugh(spot);
    timersRef.current.push(window.setTimeout(() => setActiveSpot(null), 360));
  };

  const showSequence = (nextSequence) => {
    clearTimers();
    setPhase('showing');
    setMessage('Escuchando');

    nextSequence.forEach((id, index) => {
      const spot = getSpot(id);
      timersRef.current.push(window.setTimeout(() => lightSpot(spot), 520 + index * 700));
    });

    timersRef.current.push(
      window.setTimeout(() => {
        setPhase('playing');
        setAnswerIndex(0);
        setMessage('Su turno');
      }, 720 + nextSequence.length * 700),
    );
  };

  const startGame = () => {
    getAudioContext();
    setCompletedRounds(0);
    setActiveSpot(null);
    const firstSpot = SPOTS[Math.floor(Math.random() * SPOTS.length)].id;
    const nextSequence = [firstSpot];
    setSequence(nextSequence);
    setAnswerIndex(0);
    showSequence(nextSequence);
  };

  const advanceTestMelt = () => {
    const next = revealed ? 0 : Math.min(completedRounds + 1, REVEAL_ROUND);
    setCompletedRounds(next);
    setRevealed(next === REVEAL_ROUND);
  };

  const handleSpotPress = (spot) => {
    if (TEST_MELT_ON_TAP) return;
    if (phase !== 'playing') return;

    if (!ALLOW_TEST_MISTAKES && spot.id !== sequence[answerIndex]) {
      setActiveSpot(spot.id);
      timersRef.current.push(window.setTimeout(() => setActiveSpot(null), 360));
      playLossSound();
      setPhase('lost');
      setCompletedRounds(0);
      setMessage('Intenten de nuevo.');
      return;
    }

    lightSpot(spot);
    const nextIndex = answerIndex + 1;
    if (nextIndex < sequence.length) {
      setAnswerIndex(nextIndex);
      return;
    }

    setCompletedRounds(sequence.length);
    if (sequence.length >= REVEAL_ROUND) {
      setRevealed(true);
    }

    const nextSequence = [...sequence, SPOTS[Math.floor(Math.random() * SPOTS.length)].id];
    setSequence(nextSequence);
    setPhase('showing');
    setMessage(`Ronda ${sequence.length} completada.`);
    timersRef.current.push(window.setTimeout(() => showSequence(nextSequence), 800));
  };

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSnowmanScale(Math.min(1, (width - 16) / 288, (height - 16) / 432));
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      audioContextRef.current?.close();
      soundPlayersRef.current.forEach((player) => player.pause());
    },
    [],
  );

  return (
    <main className="page day16-page" onClick={TEST_MELT_ON_TAP ? advanceTestMelt : undefined}>
      <section className="day01-card day16-card">
        <div className="day16-layout">
          <p className="day01-date day16-date">Diciembre 16</p>
          <Day16Message rounds={completedRounds} revealed={revealed} />

          <div className="day16-scene">
            <p className="day16-status" aria-live="polite">{message}</p>
            <div ref={stageRef} className={`day16-snowman-stage${phase === 'lost' ? ' is-lost' : ''}`}>
              <div className="day16-snowfall" aria-hidden="true" />
              <div className="day16-snowman" style={{ '--day16-snowman-scale': snowmanScale }} role="group" aria-label="Muneco de nieve de risas">
                <img
                  className="day16-snowman-art"
                  src={SNOWMAN_IMAGE}
                  width="1024"
                  height="1536"
                  alt=""
                  draggable={false}
                />
                <svg className="day16-highlights" viewBox="0 0 1024 1536" aria-hidden="true">
                  <defs>
                    <clipPath id="day16-highlight-hat">
                      <path d="M318 70 394 18 555 12 618 24 634 204 681 195 724 209 736 246 698 279 618 290 364 356 309 362 280 326 281 291 350 260Z" />
                    </clipPath>
                    <clipPath id="day16-highlight-nose">
                      <path d="M530 366 563 370 650 401 654 419 550 437 517 419 513 392Z" />
                    </clipPath>
                    <clipPath id="day16-highlight-scarf">
                      <path d="M344 514C381 551 553 569 613 537C642 509 684 505 700 532L707 575C746 636 768 700 781 757L819 879 823 920 793 927 784 953 761 937 744 959 718 938 695 956 669 940 649 943 639 909 642 839 632 711 621 632C547 657 390 643 339 611C322 583 324 545 344 514Z" />
                    </clipPath>
                    <clipPath id="day16-highlight-button">
                      <circle cx="519" cy="714" r="34" />
                      <circle cx="522" cy="854" r="35" />
                      <circle cx="526" cy="986" r="37" />
                    </clipPath>
                    <filter id="day16-accessory-glow" x="-30%" y="-30%" width="160%" height="160%">
                      <feComponentTransfer>
                        <feFuncR type="linear" slope="1.35" intercept="0.08" />
                        <feFuncG type="linear" slope="1.35" intercept="0.06" />
                        <feFuncB type="linear" slope="1.35" intercept="0.02" />
                      </feComponentTransfer>
                      <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ffe09a" floodOpacity="1" />
                    </filter>
                  </defs>
                  {activeSpot && (
                    <g filter="url(#day16-accessory-glow)">
                      <image
                        href={SNOWMAN_IMAGE}
                        width="1024"
                        height="1536"
                        clipPath={`url(#day16-highlight-${activeSpot})`}
                      />
                    </g>
                  )}
                </svg>

                {SPOTS.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className={`day16-spot ${spot.className}${activeSpot === spot.id ? ' is-lit' : ''}`}
                    aria-label={`Reir con el ${spot.label}: ${spot.laugh}`}
                    disabled={!TEST_MELT_ON_TAP && phase !== 'playing'}
                    onClick={() => handleSpotPress(spot)}
                  >
                    {spot.id === 'scarf' && <span className="day16-scarf-tail-hit" aria-hidden="true" />}
                  </button>
                ))}
                {activeSpot && (
                  <span className="day16-laugh" aria-hidden="true">
                    {getSpot(activeSpot).laugh}
                  </span>
                )}
              </div>
            </div>

            {TEST_MELT_ON_TAP ? null : phase === 'idle' || phase === 'lost' ? <button
              type="button"
              className="day16-start-button"
              onClick={startGame}
            >
              {phase === 'idle' ? 'Empezar' : 'Intentar de nuevo'}
            </button> : <p className="day16-round-count">Ronda {sequence.length}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
