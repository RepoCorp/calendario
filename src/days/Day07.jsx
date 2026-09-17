import { useEffect, useRef, useState } from 'react';

const CANDLES = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  left: 20 + index * 15,
  hue: [0, 42, 122, 210, 318][index],
}));

const BLOW_RMS_THRESHOLD = 0.085;
const BLOW_FLATNESS_THRESHOLD = 0.48;
const BLOW_CLIP_RATIO_THRESHOLD = 0.012;
const BLOW_SUSTAIN_MS = 220;
const BLOW_COOLDOWN_MS = 900;

function buildLitCandles() {
  return CANDLES.map((candle) => candle.id);
}

export default function Day07() {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(0);
  const bufferRef = useRef(null);
  const frequencyBufferRef = useRef(null);
  const lastBlowRef = useRef(0);
  const blowStartedAtRef = useRef(0);

  const [litCandles, setLitCandles] = useState(buildLitCandles);
  const [micReady, setMicReady] = useState(false);
  const [volume, setVolume] = useState(0);
  const [message, setMessage] = useState('Toquen el boton y soplen para apagar las velitas.');
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(animationRef.current);
      sourceRef.current?.disconnect?.();
      analyserRef.current?.disconnect?.();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close?.();
    };
  }, []);

  const extinguishNextCandle = () => {
    setLitCandles((current) => {
      if (current.length === 0) return current;

      const next = current.slice(0, -1);
      if (next.length === 0) {
        setMessage('Las apagaron todas. Que lindo deseo de cumpleanos.');
      } else {
        setMessage('Sigan soplando, ya casi se apagan todas.');
      }
      return next;
    });
  };

  const monitorMic = () => {
    const analyser = analyserRef.current;
    const buffer = bufferRef.current;
    const frequencyBuffer = frequencyBufferRef.current;

    if (!analyser || !buffer || !frequencyBuffer) return;

    analyser.getByteTimeDomainData(buffer);
    analyser.getByteFrequencyData(frequencyBuffer);

    let sum = 0;
    let clippedSamples = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const centered = (buffer[index] - 128) / 128;
      sum += centered * centered;
      if (Math.abs(centered) > 0.96) clippedSamples += 1;
    }

    const rms = Math.sqrt(sum / buffer.length);
    const clipRatio = clippedSamples / buffer.length;
    const boosted = Math.min(1, rms * 5.4);
    setVolume(boosted);

    // Airflow creates a sustained, broadband noise burst; speech is usually more tonal.
    let magnitudeSum = 0;
    let logMagnitudeSum = 0;
    const startBin = Math.max(1, Math.floor(frequencyBuffer.length * 0.03));
    const endBin = Math.floor(frequencyBuffer.length * 0.42);
    const binCount = endBin - startBin;

    for (let index = startBin; index < endBin; index += 1) {
      const magnitude = frequencyBuffer[index] / 255;
      magnitudeSum += magnitude;
      logMagnitudeSum += Math.log(magnitude + 0.0001);
    }

    const averageMagnitude = magnitudeSum / binCount;
    const spectralFlatness = Math.exp(logMagnitudeSum / binCount) / (averageMagnitude + 0.0001);
    const hasBlowShape =
      rms >= BLOW_RMS_THRESHOLD &&
      (spectralFlatness >= BLOW_FLATNESS_THRESHOLD || clipRatio >= BLOW_CLIP_RATIO_THRESHOLD);
    const now = window.performance.now();
    if (hasBlowShape && blowStartedAtRef.current === 0) {
      blowStartedAtRef.current = now;
    }

    if (!hasBlowShape) {
      blowStartedAtRef.current = 0;
    }

    if (
      hasBlowShape &&
      now - blowStartedAtRef.current >= BLOW_SUSTAIN_MS &&
      now - lastBlowRef.current > BLOW_COOLDOWN_MS
    ) {
      lastBlowRef.current = now;
      blowStartedAtRef.current = 0;
      extinguishNextCandle();
    }

    animationRef.current = window.requestAnimationFrame(monitorMic);
  };

  const enableMic = async () => {
    try {
      setError('');
      setMessage('Escuchando... soplen hacia el telefono.');

      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          setError('Este navegador no soporta audio para detectar soplidos.');
          return;
        }
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await window.navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 1024;
        analyserRef.current.smoothingTimeConstant = 0.08;
        bufferRef.current = new Uint8Array(analyserRef.current.fftSize);
        frequencyBufferRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      }

      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        sourceRef.current.connect(analyserRef.current);
      }

      setMicReady(true);
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = window.requestAnimationFrame(monitorMic);
    } catch (micError) {
      setError('No pude acceder al microfono. Revisen el permiso e intenten otra vez.');
      setMessage('Sin microfono no puedo detectar el soplido.');
    }
  };

  const relightCandles = () => {
    setLitCandles(buildLitCandles());
    setMessage(micReady ? 'Velitas encendidas otra vez. Soplen para apagarlas.' : 'Toquen el boton y soplen para apagar las velitas.');
    setVolume(0);
    lastBlowRef.current = 0;
    blowStartedAtRef.current = 0;
  };

  return (
    <main className="page day07-page">
      <section className="day01-card day07-card">
        <div className="day07-layout">
          <article className="day01-note day07-note">
            <p className="day01-date">Diciembre 7</p>
            <h1 className="day01-title day07-title">
              <span>Cumpleanos GKye,</span>
              <span>soplen las velitas.</span>
            </h1>
            <p className="day01-lead day07-lead">
              Enciendan el microfono, acerquense al pastel y soplen hacia el telefono para apagar
              las velas una por una. Ojala venga con un deseo bonito tambien.
            </p>
          </article>

          <div className="day07-scene">
            <p className="day07-subtitle">{message}</p>

            <div className="day07-cake-wrap">
              <div className="day07-cake-stage" aria-label="Pastel de cumpleanos con velas">
                <div className="day07-cake-top" />
                <div className="day07-cake-icing" />
                <div className="day07-cake-body">
                  <span className="day07-cake-sprinkle day07-cake-sprinkle-left" aria-hidden="true" />
                  <span className="day07-cake-sprinkle day07-cake-sprinkle-center" aria-hidden="true" />
                  <span className="day07-cake-sprinkle day07-cake-sprinkle-right" aria-hidden="true" />
                </div>
                <div className="day07-cake-plate" />

                {CANDLES.map((candle) => {
                  const isLit = litCandles.includes(candle.id);
                  return (
                    <div
                      key={candle.id}
                      className="day07-candle"
                      style={{ left: `${candle.left}%`, '--candle-hue': candle.hue }}
                    >
                      <span className="day07-candle-body" />
                      <span className="day07-candle-wick" />
                      {isLit ? <span className="day07-flame" aria-hidden="true" /> : null}
                      {isLit ? <span className="day07-flame-glow" aria-hidden="true" /> : null}
                    </div>
                  );
                })}
              </div>

              <div className="day07-meter" aria-hidden="true">
                <div className="day07-meter-track">
                  <div className="day07-meter-fill" style={{ transform: `scaleX(${Math.max(0.04, volume)})` }} />
                </div>
                <span className="day07-meter-label">Soplido</span>
              </div>
            </div>

            <div className="day07-actions">
              <button type="button" className="day07-button" onClick={enableMic}>
                {micReady ? 'Microfono activo' : 'Encender microfono'}
              </button>
              <button type="button" className="day07-button day07-button-secondary" onClick={relightCandles}>
                Volver a encender
              </button>
            </div>

            {error ? <p className="day07-error">{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
