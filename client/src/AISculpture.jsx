import { motion } from "framer-motion";

export default function AISculpture() {
  return (
    <div className="ai-sculpture">

      {/* Atmospheric glow */}
      <div className="sculpture-glow" />
      <div className="sculpture-grid" />

      {/* Main sculpture */}
      <motion.div
        className="sculpture-object"
        animate={{ y: [0, -12, 0], rotate: [0, 2, 0] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <svg
          viewBox="0 0 500 500"
          className="sculpture-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="coreGradient">
              <stop offset="0%" stopColor="#F0DDAA" />
              <stop offset="35%" stopColor="#20C997" />
              <stop offset="100%" stopColor="#07110E" />
            </radialGradient>

            <linearGradient id="metalGradient" x1="50" y1="50" x2="450" y2="450">
              <stop stopColor="#F0DDAA" />
              <stop offset="50%" stopColor="#D6B875" />
              <stop offset="100%" stopColor="#0F8B62" />
            </linearGradient>

            <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#20C997" />
              <stop offset="100%" stopColor="#075A40" />
            </linearGradient>

            <filter id="coreGlow">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer orbital rings */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{
              duration: 45,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ transformOrigin: "250px 250px" }}
          >
            <ellipse
              cx="250"
              cy="250"
              rx="190"
              ry="82"
              stroke="#D6B875"
              strokeWidth="1"
              strokeOpacity=".55"
              transform="rotate(-32 250 250)"
            />

            <circle cx="72" cy="144" r="5" fill="#F0DDAA" />
          </motion.g>

          <motion.g
            animate={{ rotate: -360 }}
            transition={{
              duration: 55,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ transformOrigin: "250px 250px" }}
          >
            <ellipse
              cx="250"
              cy="250"
              rx="160"
              ry="112"
              stroke="#20C997"
              strokeWidth="1.2"
              strokeOpacity=".5"
              transform="rotate(52 250 250)"
            />

            <circle cx="400" cy="205" r="4" fill="#20C997" />
          </motion.g>

          {/* Interconnected structure */}
          <motion.path
            d="M130 160 C190 60 310 60 370 160 C430 260 350 390 250 390 C150 390 70 260 130 160Z"
            stroke="url(#metalGradient)"
            strokeWidth="3"
            strokeOpacity=".85"
            animate={{ pathLength: [0.85, 1, 0.85] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.path
            d="M155 330 C95 235 180 105 250 110 C320 105 405 235 345 330"
            stroke="url(#emeraldGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Central intelligence core */}
          <circle
            cx="250"
            cy="250"
            r="95"
            fill="#20C997"
            opacity=".08"
            filter="url(#coreGlow)"
          />

          <circle
            cx="250"
            cy="250"
            r="65"
            fill="url(#coreGradient)"
            opacity=".2"
          />

          <motion.circle
            cx="250"
            cy="250"
            r="38"
            fill="url(#coreGradient)"
            filter="url(#coreGlow)"
            animate={{
              r: [34, 41, 34],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <circle
            cx="250"
            cy="250"
            r="15"
            fill="#F0DDAA"
            opacity=".9"
          />

         {/* DEVORA GOLDEN INTELLIGENCE CORE */}

<defs>
  <linearGradient
    id="devoraLogoGradient"
    x1="10"
    y1="5"
    x2="59"
    y2="60"
  >
    <stop offset="0%" stopColor="#F5DFA6" />
    <stop offset="50%" stopColor="#E8C878" />
    <stop offset="100%" stopColor="#C5A45D" />
  </linearGradient>


  <filter id="goldLogoGlow">
  <feGaussianBlur stdDeviation="3.5" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
</defs>

{/* Golden outer glow */}
<circle
  cx="250"
  cy="250"
  r="78"
  fill="#E8C878"
  opacity="0.13"
  filter="url(#coreGlow)"
/>

{/* Dark golden circular base */}
<circle
  cx="250"
  cy="250"
  r="65"
  fill="#211B0D"
  stroke="#E8C878"
  strokeWidth="2"
  strokeOpacity="0.9"
/>

{/* Inner golden border */}
<circle
  cx="250"
  cy="250"
  r="55"
  fill="#C5A45D"
  fillOpacity="0.12"
  stroke="#F5DFA6"
  strokeWidth="1.2"
  strokeOpacity="0.7"
/>

{/* DEVORA DA LOGO */}
<g transform="translate(205 205) scale(1.4)">

  {/* D */}
  <path
    d="M10 9 V55 H25 C40 55 48 45 48 32 C48 19 40 9 25 9 H10Z"
    stroke="url(#devoraLogoGradient)"
    strokeWidth="3.5"
    strokeLinejoin="round"
    fill="none"
  />

  {/* A */}
  <path
    d="M25 46 L43 12 L59 46"
    stroke="url(#devoraLogoGradient)"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />

  {/* A crossbar */}
  <path
    d="M34 34 H51"
    stroke="#F5DFA6"
    strokeWidth="2.5"
    strokeLinecap="round"
  />

  {/* AI signal */}
  <path
    d="M53 8 V20"
    stroke="#E8C878"
    strokeWidth="2.5"
    strokeLinecap="round"
  />

  <circle cx="53" cy="5" r="2.5" fill="#F5DFA6" />

</g>






         

          {/* Fine technical details */}
          <circle
            cx="250"
            cy="250"
            r="125"
            stroke="#D6B875"
            strokeOpacity=".2"
            strokeDasharray="3 9"
          />

        </svg>
      </motion.div>

      {/* Floating information labels */}
      <motion.div
        className="sculpture-tag sculpture-tag-one"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <span className="tag-dot" />
        AI INTELLIGENCE
      </motion.div>

      <motion.div
        className="sculpture-tag sculpture-tag-two"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        CODE UNDERSTANDING
      </motion.div>

      <motion.div
        className="sculpture-tag sculpture-tag-three"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        CONNECTED WORKSPACE
      </motion.div>

      <div className="sculpture-caption">
        <span>01 / 03</span>
        <span>INTELLIGENCE IN MOTION</span>
      </div>

    </div>
  );
}