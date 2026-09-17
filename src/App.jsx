import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { entriesBySlug, sortedEntries } from './calendarEntries';
import { isUnlockedForToday } from './dateGate';
import LockedPage from './components/LockedPage';
import NotFoundPage from './components/NotFoundPage';

function formatDayNumber(day) {
  return day < 10 ? `0${day}` : String(day);
}

function buildEntryPath(slug) {
  return `/${encodeURIComponent(slug)}`;
}

function LandingPage() {
  return (
    <main className="page shell">
      <h1>Mi Familita Advent Calendar</h1>
      <p>
        This app is configured to open each day page using a private URL:
        <br />
        <code>mifamilita.com/[random_string]</code>
      </p>
      <p>Edit <code>src/calendarEntries.js</code> to set your own URLs.</p>
      <h2>Configured Links</h2>
      <ul className="link-list">
        {sortedEntries.map((entry) => (
          <li key={entry.slug}>
            <Link to={buildEntryPath(entry.slug)}>{`Day ${formatDayNumber(entry.day)}`}</Link>
            <span>{entry.unlockDate}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

function AdventRoute() {
  const { slug } = useParams();
  const entry = entriesBySlug[slug ?? ''];

  if (!entry) {
    return <NotFoundPage />;
  }

  if (!isUnlockedForToday(entry.unlockDate)) {
    return <LockedPage day={entry.day} unlockDate={entry.unlockDate} />;
  }

  const DayComponent = lazy(entry.loadComponent);

  return (
    <Suspense fallback={<main className="page shell">Loading day page...</main>}>
      <DayComponent />
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/:slug" element={<AdventRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
