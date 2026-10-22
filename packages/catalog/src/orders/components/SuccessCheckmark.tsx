export function SuccessCheckmark() {
  return (
    <svg
      className="mx-auto h-16 w-16 text-green-600"
      viewBox="0 0 52 52"
      fill="none"
    >
      <style>{`
        @keyframes draw-success { to { stroke-dashoffset: 0; } }
      `}</style>
      <circle
        cx="26"
        cy="26"
        r="25"
        stroke="currentColor"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray={100}
        strokeDashoffset={100}
        style={{
          animation: 'draw-success 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards',
        }}
      />
      <path
        d="M14 27l7.5 7.5L38 17"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        strokeDasharray={100}
        strokeDashoffset={100}
        style={{
          animation:
            'draw-success 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards',
        }}
      />
    </svg>
  );
}
