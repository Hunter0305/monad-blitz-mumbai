import { useState, useEffect } from "react";

interface CountdownTimerProps {
  deadline: Date;
  size?: 'sm' | 'md' | 'lg';
}

export function CountdownTimer({ deadline, size = 'md' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const expired = timeLeft.total <= 0;
  const progress = expired ? 0 : Math.min(100, (timeLeft.total / (30 * 24 * 60 * 60 * 1000)) * 100);

  const ringSize = size === 'lg' ? 120 : size === 'md' ? 80 : 60;
  const strokeWidth = size === 'lg' ? 6 : 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="-rotate-90">
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={expired ? "hsl(var(--destructive))" : "url(#gradient)"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(260, 80%, 60%)" />
              <stop offset="100%" stopColor="hsl(210, 90%, 55%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === 'lg' ? 'text-lg' : 'text-xs'} ${expired ? 'text-destructive' : 'text-foreground'}`}>
            {expired ? 'Expired' : `${timeLeft.days}d`}
          </span>
        </div>
      </div>
      {!expired && size !== 'sm' && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{timeLeft.hours}h</span>
          <span>{timeLeft.minutes}m</span>
          <span>{timeLeft.seconds}s</span>
        </div>
      )}
    </div>
  );
}

function getTimeLeft(deadline: Date) {
  const total = deadline.getTime() - Date.now();
  return {
    total,
    days: Math.max(0, Math.floor(total / (1000 * 60 * 60 * 24))),
    hours: Math.max(0, Math.floor((total / (1000 * 60 * 60)) % 24)),
    minutes: Math.max(0, Math.floor((total / (1000 * 60)) % 60)),
    seconds: Math.max(0, Math.floor((total / 1000) % 60)),
  };
}
