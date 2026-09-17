import { useEffect, useMemo, useRef, useState } from 'react';

const FAMILY_API_BASE_URL = (import.meta.env.VITE_FAMILY_API_BASE_URL ?? '').replace(/\/$/, '');

function buildApiUrl(path) {
  return `${FAMILY_API_BASE_URL}${path}`;
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function Day14() {
  const [photos, setPhotos] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Cargando sus recuerdos...');
  const inputRef = useRef(null);

  const isConfigured = useMemo(() => FAMILY_API_BASE_URL.length > 0, []);
  const selectedPhoto = photos[selectedIndex] ?? null;

  const loadPhotos = async () => {
    if (!isConfigured) {
      setStatus('error');
      setMessage('Falta configurar VITE_FAMILY_API_BASE_URL para leer las fotos del album.');
      return;
    }

    setStatus('loading');
    setMessage('Cargando sus recuerdos...');

    try {
      const response = await fetch(buildApiUrl('/family-photos'));
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las fotos.');
      }

      const nextPhotos = Array.isArray(data.photos) ? data.photos : [];
      setPhotos(nextPhotos);
      setSelectedIndex(0);
      setStatus('ready');
      setMessage(
        nextPhotos.length
          ? 'Deslicen el album horizontal y toquen una foto para verla grande.'
          : 'Todavia no hay fotos en el album. Pueden subir la primera aqui.'
      );
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'No se pudieron cargar las fotos.');
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    if (!isConfigured) {
      setStatus('error');
      setMessage('Falta configurar la API del album para subir fotos.');
      return;
    }

    setStatus('uploading');
    setMessage('Subiendo fotitos...');

    try {
      for (const file of files) {
        const uploadResponse = await fetch(buildApiUrl('/family-photos/upload-url'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
          }),
        });

        const uploadData = await uploadResponse.json().catch(() => ({}));

        if (!uploadResponse.ok || !uploadData.uploadUrl) {
          throw new Error(uploadData.error || 'No se pudo preparar la subida.');
        }

        const putResponse = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!putResponse.ok) {
          throw new Error(`No se pudo subir ${file.name}.`);
        }
      }

      setMessage('Las fotos ya quedaron en el album.');
      await loadPhotos();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'No se pudieron subir las fotos.');
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <main className="page day14-page">
      <section className="day01-card day14-card">
        <div className="day14-layout">
          <article className="day01-note day14-note">
            <p className="day01-date">Diciembre 14</p>
            <h1 className="day01-title day14-title">
              <span>Nuestra familia,</span>
              <span>en fotitos queridas.</span>
            </h1>
            <p className="day01-lead day14-lead">
              Este dia queda como un rinconcito para mirar recuerdos bonitos. Las fotos salen del
              album en S3 y tambien pueden subir otras nuevas desde aqui.
            </p>
          </article>

          <div className="day14-scene">
            <p
              className={`day14-subtitle${
                status === 'error' ? ' is-error' : ''
              }${status === 'uploading' ? ' is-uploading' : ''}`}
            >
              {message}
            </p>

            <div className="day14-toolbar">
              <label className="day14-upload-button">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                />
                <span>{status === 'uploading' ? 'Subiendo...' : 'Agregar mas fotos'}</span>
              </label>

              <button type="button" className="day14-refresh-button" onClick={loadPhotos}>
                Volver a cargar
              </button>
            </div>

            {selectedPhoto ? (
              <article className="day14-featured-card">
                <img className="day14-featured-image" src={selectedPhoto.src} alt={selectedPhoto.alt} />
                <div className="day14-featured-meta">
                  <p className="day14-featured-caption">{selectedPhoto.caption}</p>
                  {selectedPhoto.uploadedAt ? (
                    <p className="day14-featured-date">{formatDate(selectedPhoto.uploadedAt)}</p>
                  ) : null}
                </div>
              </article>
            ) : (
              <div className="day14-empty-card">
                <p className="day14-empty-title">El album espera sus recuerdos</p>
                <p className="day14-empty-text">
                  Cuando suban una foto al bucket o desde este boton, aparecera aqui.
                </p>
              </div>
            )}

            <div className="day14-gallery-rail" role="list" aria-label="Album familiar horizontal">
              {photos.map((photo, index) => (
                <button
                  key={photo.key}
                  type="button"
                  role="listitem"
                  className={`day14-thumb-card${index === selectedIndex ? ' is-selected' : ''}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <img className="day14-thumb-image" src={photo.src} alt={photo.alt} />
                  <span className="day14-thumb-caption">{photo.caption}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
