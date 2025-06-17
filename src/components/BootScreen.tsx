import { useEffect, useState } from 'react';

const bootLines = [
  '[    0.000001] Booting BlogLabs...',
  '[    0.000004] Initializing kernel...',
  '[    0.000007] Mounting /dev/minimal-blog...',
  '[    0.000010] Loading content modules...',
  '[    0.000013] Starting user shell...'
];

export default function BootScreen({ onFinish }: { onFinish: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setVisibleLines(prev => [...prev, bootLines[index]]);
      index++;
      if (index === bootLines.length) {
        clearInterval(interval);
        setTimeout(onFinish, 1000);
      }
    }, 500);
  }, [onFinish]);

  return (
    <div className="h-screen bg-black text-green-400 font-mono flex flex-col justify-top px-8 text-base animate-flicker w-screen">
      {visibleLines.map((line, idx) => (
        <p key={idx} className="leading-relaxed">{line}</p>
      ))}
    </div>
  );
}
