const adventYear = Number(import.meta.env.VITE_ADVENT_YEAR ?? 2026);

const slugList = [
  'nieve-8k2f',
  'estrella-q9m1',
  'regalo-r3v7',
  'reno-z2b4',
  'campana-x5d8',
  'dulce-j7p2',
  'luna-w4g9',
  'abrazo-u6h3',
  'cacao-s1n5',
  'farol-t8e2',
  'musica-k9c6',
  'carta-v5y1',
  'nube-p2a8',
  'familia-b6r4',
  'magia-l3m7',
  'sonrisa-h8q2',
  'pino-d4t9',
  'amor-f7u1',
  'luz-c5w3',
  'sueno-g2x8',
  'paz-y9j4',
  'chispa-a1k6',
  'brisa-m8z2',
  'navidad-e3n7',
];

function buildUnlockDate(day) {
  return `${adventYear}-12-${String(day).padStart(2, '0')}`;
}

export const sortedEntries = Array.from({ length: 24 }, (_, index) => {
  const day = index + 1;

  return {
    day,
    slug: slugList[index],
    unlockDate: buildUnlockDate(day),
    loadComponent: () => import(`./days/Day${String(day).padStart(2, '0')}.jsx`),
  };
});

export const entriesBySlug = Object.fromEntries(sortedEntries.map((entry) => [entry.slug, entry]));
