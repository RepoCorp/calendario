import { useState } from 'react';

export default function Day14() {
  const [count, setCount] = useState(0);

  return (
    <main className="page">
      <section className="shell day-card">
        <h1>Day 14</h1>
        <p>
          Placeholder page for Day 14. You can now replace this file with your real content: text,
          animations, games, or other interactive elements.
        </p>
        <div className="day-counter">
          <button onClick={() => setCount((value) => value + 1)}>Tap interaction</button>
          <span>Count: {count}</span>
        </div>
        <a href="/">Back to calendar</a>
      </section>
    </main>
  );
}
