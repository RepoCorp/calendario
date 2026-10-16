import { useCallback, useEffect, useRef, useState } from 'react';
import { createBlowDetector } from './blowDetector';

// One microphone session for one wish. Detection is shared with the birthday candles.
export default function useBlowMicrophone(onBlow) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [isBlowing, setIsBlowing] = useState(false);
  const sessionRef = useRef(null);
  const mountedRef = useRef(false);
  const onBlowRef = useRef(onBlow);
  onBlowRef.current = onBlow;

  const stop = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      window.cancelAnimationFrame(session.frame);
      session.source?.disconnect();
      session.analyser?.disconnect();
      session.stream?.getTracks().forEach((track) => track.stop());
      if (session.context) {
        session.context.onstatechange = null;
        void session.context.close().catch(() => {});
      }
    }
    if (mountedRef.current) {
      setStatus('idle');
      setIsBlowing(false);
      setError('');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const pause = () => {
      if (sessionRef.current) {
        stop();
        setStatus('paused');
      }
    };
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      stop();
    };
  }, [stop]);

  const start = useCallback(async () => {
    if (sessionRef.current || !mountedRef.current) return;
    const session = { frame: 0, context: null, stream: null, source: null, analyser: null };
    sessionRef.current = session;
    const current = () => mountedRef.current && sessionRef.current === session;
    setStatus('requesting');
    setError('');

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported-microphone');
      }
      if (!AudioContextClass) throw new Error('unsupported-audio');

      session.context = new AudioContextClass();
      if (session.context.state === 'suspended') await session.context.resume();
      if (!current()) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      // Permission can resolve after editing, leaving the page, or hiding the tab.
      if (!current()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      session.stream = stream;
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState === 'ended') throw new Error('missing-track');

      session.analyser = session.context.createAnalyser();
      session.analyser.fftSize = 1024;
      session.analyser.smoothingTimeConstant = 0.08;
      session.source = session.context.createMediaStreamSource(stream);
      session.source.connect(session.analyser);
      const buffer = new Uint8Array(session.analyser.fftSize);
      const frequencyBuffer = new Uint8Array(session.analyser.frequencyBinCount);
      const detector = createBlowDetector();

      track.addEventListener('ended', () => {
        if (!current()) return;
        stop();
        setStatus('error');
        setError('El micrófono se desconectó. Actívalo otra vez para seguir.');
      }, { once: true });
      session.context.onstatechange = () => {
        if (!current() || session.context.state === 'running') return;
        stop();
        setStatus('paused');
      };

      const monitor = () => {
        if (!current()) return;
        session.analyser.getByteTimeDomainData(buffer);
        session.analyser.getByteFrequencyData(frequencyBuffer);
        const result = detector.sample(buffer, frequencyBuffer, window.performance.now());
        if (result.confirmed) {
          stop();
          onBlowRef.current();
          return;
        }
        setIsBlowing(result.isBlowing);
        session.frame = window.requestAnimationFrame(monitor);
      };

      setStatus('listening');
      session.frame = window.requestAnimationFrame(monitor);
    } catch (micError) {
      if (!current()) return;
      stop();
      setStatus('error');
      if (micError.name === 'NotAllowedError' || micError.name === 'SecurityError') {
        setError('Permite el micrófono en tu navegador y vuelve a intentarlo.');
      } else if (micError.name === 'NotFoundError' || micError.message === 'missing-track') {
        setError('No encuentro un micrófono. Conecta uno o abre esta página en tu teléfono.');
      } else if (micError.message === 'unsupported-microphone' || micError.message === 'unsupported-audio') {
        setError('Este navegador no permite usar el micrófono aquí. Abre la página con HTTPS en Safari o Chrome.');
      } else {
        setError('No pude activar el micrófono. Revisa que otra aplicación no lo esté usando e inténtalo otra vez.');
      }
    }
  }, [stop]);

  return { status, error, isBlowing, start, stop };
}
