import { useMemo, useState } from 'react';

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL ?? '';

const INITIAL_FORM = {
  senderName: '',
  replyTo: '',
  subject: '',
  message: '',
};

export default function Day12() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('Escriban un mensajito bonito y cuando quieran lo mandamos.');

  const isConfigured = useMemo(() => EMAIL_API_URL.trim().length > 0, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isConfigured) {
      setStatus('error');
      setFeedback('Todavia falta configurar la direccion de la API para poder enviar el correo.');
      return;
    }

    if (!form.senderName.trim() || !form.subject.trim() || !form.message.trim()) {
      setStatus('error');
      setFeedback('Pongan su nombre, un asunto y un mensaje antes de enviarlo.');
      return;
    }

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
          replyTo: form.replyTo.trim(),
          subject: form.subject.trim(),
          text: `${form.message.trim()}\n\nDe: ${form.senderName.trim()}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>${form.message.trim().replace(/\n/g, '<br />')}</p>
              <p><strong>De:</strong> ${form.senderName.trim()}</p>
              ${form.replyTo.trim() ? `<p><strong>Responder a:</strong> ${form.replyTo.trim()}</p>` : ''}
            </div>
          `,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo enviar el correo.');
      }

      setStatus('success');
      setFeedback('Mensajito enviado. Ya va en camino.');
      setForm(INITIAL_FORM);
    } catch (error) {
      setStatus('error');
      setFeedback(error.message || 'No se pudo enviar el correo.');
    }
  };

  return (
    <main className="page day12-page">
      <section className="day01-card day12-card">
        <div className="day12-layout">
          <article className="day01-note day12-note">
            <p className="day01-date">Diciembre 12</p>
            <h1 className="day01-title day12-title">
              <span>Una cartita por correo,</span>
              <span>escribanla aqui.</span>
            </h1>
            <p className="day01-lead day12-lead">
              Este dia queda para que sus peques les escriban algo lindo y lo manden directo a su
              correo. Como una mini postal navidena hecha desde la pagina.
            </p>
          </article>

          <div className="day12-scene">
            <p className={`day12-subtitle${status === 'error' ? ' is-error' : ''}${status === 'success' ? ' is-success' : ''}`}>
              {feedback}
            </p>

            <form className="day12-form" onSubmit={handleSubmit}>
              <label className="day12-field">
                <span>Su nombre</span>
                <input
                  name="senderName"
                  type="text"
                  value={form.senderName}
                  onChange={updateField}
                  placeholder="Quien escribe"
                  autoComplete="off"
                />
              </label>

              <label className="day12-field">
                <span>Correo para responder</span>
                <input
                  name="replyTo"
                  type="email"
                  value={form.replyTo}
                  onChange={updateField}
                  placeholder="opcional@correo.com"
                  autoComplete="email"
                />
              </label>

              <label className="day12-field">
                <span>Asunto</span>
                <input
                  name="subject"
                  type="text"
                  value={form.subject}
                  onChange={updateField}
                  placeholder="Un mensaje para mami"
                  autoComplete="off"
                />
              </label>

              <label className="day12-field">
                <span>Mensaje</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={updateField}
                  placeholder="Escriban aqui todo lo que quieran decir..."
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
