import { mountCocoaGame } from '../components/mountCocoaGame.js';

const host = document.querySelector('#cup-preview');
const dispose = mountCocoaGame(host, document, ({ elapsed }) => {
  document.querySelector('#game-time').textContent = `${elapsed.toFixed(1)} s`;
});
window.addEventListener('pagehide', dispose, { once: true });
