export function GZapiLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* G — Google Blue top-left */}
      <rect x="2" y="2" width="11" height="11" rx="3" fill="#4285F4" />
      {/* Z — Google Red top-right */}
      <rect x="15" y="2" width="11" height="11" rx="3" fill="#EA4335" />
      {/* A — Google Yellow bottom-left */}
      <rect x="2" y="15" width="11" height="11" rx="3" fill="#FBBC05" />
      {/* PI — Google Green bottom-right */}
      <rect x="15" y="15" width="11" height="11" rx="3" fill="#34A853" />
      {/* White letters */}
      <text x="7.5" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="system-ui">G</text>
      <text x="20.5" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="system-ui">Z</text>
      <text x="7.5" y="24" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="system-ui">A</text>
      <text x="20.5" y="24" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="system-ui">PI</text>
    </svg>
  )
}
