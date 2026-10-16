import { useMemo, useRef, useState } from 'react';
import '../components/Day12Layout.css';

const EMAIL_API_URL = (import.meta.env.VITE_EMAIL_API_URL ?? '').trim();

const MESSAGE_SUBJECT = 'Mensajito para mi mamá';

const INITIAL_FORM = {
  senderName: '',
  message: '',
};

export default function Day12() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('idle');
  const sending = useRef(false);
  const [feedback, setFeedback] = useState('');

  const isConfigured = useMemo(() => EMAIL_API_URL.trim().length > 0, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending.current) return;

    if (!isConfigured) {
      setStatus('error');
      setFeedback('Todavia falta configurar la direccion de la API para poder enviar el correo.');
      return;
    }

    if (!form.senderName.trim() || !form.message.trim()) {
      setStatus('error');
      setFeedback('Pongan su nombre y un mensaje antes de enviarlo.');
      return;
    }

    sending.current = true;
    setStatus('sending');
    setFeedback('Mandando el correo...');

    try {
      const response = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderName: form.senderName.trim(),
          subject: MESSAGE_SUBJECT,
          message: form.message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok !== true || typeof data.messageId !== 'string' || !data.messageId) {
        throw new Error(data?.error || 'No se pudo enviar el correo.');
      }

      setStatus('success');
      setFeedback('Mensajito enviado. Ya va en camino.');
      setForm(INITIAL_FORM);
    } catch (error) {
      setStatus('error');
      setFeedback(error.message || 'No se pudo enviar el correo.');
    } finally {
      sending.current = false;
    }
  };

  return (
    <main className="page day12-page">
      <section className="day01-card day12-card">
        <div className="day12-layout">
          <p className="day01-date day12-date">Diciembre 12</p>
          <article className="day01-note day12-note">
            <h1 className="day12-subject">Asunto: {MESSAGE_SUBJECT}</h1>
            <p className="day12-intro">(Hoy el mensaje va a ser de ustedes para mí ;)</p>
          </article>

          <div className="day12-scene">
            {feedback && (
              <p role="status" aria-live="polite" className={`day12-subtitle${status === 'error' ? ' is-error' : ''}${status === 'success' ? ' is-success' : ''}`}>
                {feedback}
              </p>
            )}

            <form className="day12-form" onSubmit={handleSubmit} aria-busy={status === 'sending'}>
              <label className="day12-field">
                <span>De:</span>
                <input
                  name="senderName"
                  type="text"
                  maxLength={100}
                  disabled={status === 'sending'}
                  value={form.senderName}
                  onChange={updateField}
                  autoComplete="off"
                />
              </label>

              <label className="day12-field day12-message-field">
                <span>Mensaje:</span>
                <textarea
                  name="message"
                  maxLength={10000}
                  disabled={status === 'sending'}
                  value={form.message}
                  onChange={updateField}
                  rows="7"
                />
              </label>

              <button
                type="submit"
                className="day12-submit"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Enviando...' : 'Enviar correo'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
