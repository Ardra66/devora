export default function DevoraLogo({ compact = false }) {
  return (
    <div className={`devora-logo ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 64 64"
        width={compact ? "36" : "46"}
        height={compact ? "36" : "46"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Devora AI"
      >
        <defs>
          <linearGradient
            id="devora-ai-gradient"
            x1="8"
            y1="5"
            x2="58"
            y2="60"
          >
            <stop offset="0%" stopColor="#FFD28A" />
            <stop offset="45%" stopColor="#FF9F1C" />
            <stop offset="100%" stopColor="#FF6B00" />
          </linearGradient>
        </defs>

        <path
          d="M10 9 V55 H25 C40 55 48 45 48 32 C48 19 40 9 25 9 H10Z"
          stroke="url(#devora-ai-gradient)"
          strokeWidth="5"
          strokeLinejoin="round"
        />

        <path
          d="M25 46 L43 12 L59 46"
          stroke="url(#devora-ai-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M34 34 H51"
          stroke="#FFD28A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        <path
          d="M53 8 V20"
          stroke="#FFB02E"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle cx="53" cy="5" r="2.5" fill="#FFD28A" />
      </svg>
    </div>
  );
}