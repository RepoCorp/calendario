import { useEffect, useRef, useState } from 'react';

const SPOTS = [
  { id: 'hat', label: 'sombrero', laugh: 'ji ji', audio: '/sounds/snowman-hat.mp3', className: 'day16-spot-hat' },
  { id: 'nose', label: 'nariz', laugh: 'ja ja', audio: '/sounds/snowman-nose.mp3', className: 'day16-spot-nose' },
  { id: 'scarf', label: 'bufanda', laugh: 'je je', audio: '/sounds/snowman-scarf.mp3', className: 'day16-spot-scarf' },
  { id: 'button', label: 'boton', laugh: 'jo jo', audio: '/sounds/snowman-button.mp3', className: 'day16-spot-button' },
];

const getSpot = (id) => SPOTS.find((spot) => spot.id === id);

export default function Day16() {
  const audioContextRef = useRef(null);
  const soundPlayersRef = useRef(new Map());
  const timersRef = useRef([]);
  const [sequence, setSequence] = useState([]);
  const [answerIndex, setAnswerIndex] = useState(0);
  const [activeSpot, setActiveSpot] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('Miren y escuchen con cuidado. Luego repitan las risas.');

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
    setMessage('Primero escucha la risita del muneco de nieve...');

    nextSequence.forEach((id, index) => {
      const spot = getSpot(id);
      timersRef.current.push(window.setTimeout(() => lightSpot(spot), 520 + index * 700));
    });

    timersRef.current.push(
      window.setTimeout(() => {
        setPhase('playing');
        setAnswerIndex(0);
        setMessage('Ahora ustedes. Toquen las risas en el mismo orden.');
      }, 720 + nextSequence.length * 700),
    );
  };

  const startGame = () => {
    getAudioContext();
    const firstSpot = SPOTS[Math.floor(Math.random() * SPOTS.length)].id;
    const nextSequence = [firstSpot];
    setSequence(nextSequence);
    setAnswerIndex(0);
    showSequence(nextSequence);
  };

  const handleSpotPress = (spot) => {
    if (phase !== 'playing') return;

    if (spot.id !== sequence[answerIndex]) {
      setActiveSpot(spot.id);
      timersRef.current.push(window.setTimeout(() => setActiveSpot(null), 360));
      playLossSound();
      setPhase('lost');
      setMessage('Ay no, esa no era. Intenten otra vez desde el principio.');
      return;
    }

    lightSpot(spot);
    const nextIndex = answerIndex + 1;
    if (nextIndex < sequence.length) {
      setAnswerIndex(nextIndex);
      return;
    }

    const nextSequence = [...sequence, SPOTS[Math.floor(Math.random() * SPOTS.length)].id];
    setSequence(nextSequence);
    setPhase('showing');
    setMessage('Lo lograron. El muneco agrega una risita mas...');
    timersRef.current.push(window.setTimeout(() => showSequence(nextSequence), 800));
  };

  useEffect(
    () => () => {
      clearTimers();
      audioContextRef.current?.close();
      soundPlayersRef.current.forEach((player) => player.pause());
    },
    [],
  );

  return (
    <main className="page day16-page">
      <section className="day01-card day16-card">
        <div className="day16-layout">
          <article className="day01-note day16-note">
            <p className="day01-date">Diciembre 16</p>
            <h1 className="day01-title day16-title">
              <span>Las risas del</span>
              <span>muneco de nieve.</span>
            </h1>
            <p className="day01-lead day16-lead">
              Cada parte del muneco tiene su propia risita. Miren la secuencia, recuerdenla y
              hagamos reir al muneco juntos.
            </p>
          </article>

          <div className="day16-scene">
            <p className="day16-subtitle" aria-live="polite">{message}</p>
            <p className="day16-score">Ronda: {sequence.length || 0}</p>

            <div className={`day16-snowman-stage${phase === 'lost' ? ' is-lost' : ''}`}>
              <div className="day16-snowfall" aria-hidden="true" />
              <div className="day16-snowman" aria-label="Muneco de nieve de risas">
                <div className="day16-snowman-head">
                  <span className="day16-eye day16-eye-left" />
                  <span className="day16-eye day16-eye-right" />
                  <span className="day16-smile" />
                  <span className="day16-cheek day16-cheek-left" />
                  <span className="day16-cheek day16-cheek-right" />
                </div>
                <div className="day16-snowman-middle" />
                <div className="day16-snowman-bottom" />
                <span className="day16-snowman-arm day16-arm-left" />
                <span className="day16-snowman-arm day16-arm-right" />
              </div>

              {SPOTS.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  className={`day16-spot ${spot.className}${activeSpot === spot.id ? ' is-lit' : ''}`}
                  aria-label={`Reir con el ${spot.label}: ${spot.laugh}`}
                  disabled={phase !== 'playing'}
                  onClick={() => handleSpotPress(spot)}
                >
                  <span aria-hidden="true">{spot.laugh}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="day16-start-button"
              disabled={phase === 'showing'}
              onClick={startGame}
            >
              {phase === 'idle' ? 'Empezar las risas' : phase === 'lost' ? 'Intentar de nuevo' : 'Nueva ronda'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
