export default function LockedPage({ day, unlockDate }) {
  return (
    <main className="page shell">
      <h1>Day {String(day).padStart(2, '0')} is still locked</h1>
      <p>This page will open on {unlockDate} (Europe/Berlin).</p>
      <a href="/">Back to calendar</a>
    </main>
  );
}
