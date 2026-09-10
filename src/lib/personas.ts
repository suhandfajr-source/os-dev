export interface PersonaConfig {
  id: string;
  name: string;
  title: string;
  color: string;
  badgeBg: string;
  avatarSvg: string;
}

export const PERSONA_ROSTER: Record<string, PersonaConfig> = {
  'gib-run': {
    id: 'gib-run',
    name: 'Gib-run',
    title: 'Modern Web & API Sat-Set',
    color: '#38bdf8', // Sky Blue
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="gr-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#gr-bg)"/>
      <!-- Torso / Hoodie -->
      <path d="M20 95 C20 72 35 68 50 68 C65 68 80 72 80 95 Z" fill="#0f172a"/>
      <path d="M40 70 L50 82 L60 70 Z" fill="#38bdf8"/>
      <!-- Neck & Head -->
      <rect x="44" y="52" width="12" height="18" rx="4" fill="#fcd34d"/>
      <ellipse cx="50" cy="42" rx="20" ry="22" fill="#fde68a"/>
      <!-- Modern Hair -->
      <path d="M30 36 C30 20 40 18 50 18 C65 18 72 24 72 35 C66 32 58 30 50 30 C40 30 34 33 30 36 Z" fill="#1e293b"/>
      <!-- Trendy Glasses -->
      <rect x="34" y="38" width="13" height="9" rx="2" fill="none" stroke="#0284c7" stroke-width="2.5"/>
      <rect x="53" y="38" width="13" height="9" rx="2" fill="none" stroke="#0284c7" stroke-width="2.5"/>
      <line x1="47" y1="42" x2="53" y2="42" stroke="#0284c7" stroke-width="2"/>
      <!-- Eyes & Smile -->
      <circle cx="40" cy="42" r="2" fill="#0f172a"/>
      <circle cx="60" cy="42" r="2" fill="#0f172a"/>
      <path d="M44 54 Q50 58 56 54" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },

  'joke-wi': {
    id: 'joke-wi',
    name: 'Joke-Wi',
    title: 'Infrastruktur & Database',
    color: '#25d366', // WhatsApp Emerald Green
    badgeBg: 'rgba(37, 211, 102, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="jw-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#jw-bg)"/>
      <!-- White Shirt -->
      <path d="M20 95 C20 74 35 70 50 70 C65 70 80 74 80 95 Z" fill="#ffffff"/>
      <polygon points="46,70 50,78 54,70" fill="#cbd5e1"/>
      <!-- Head & Neck -->
      <rect x="44" y="54" width="12" height="18" rx="4" fill="#fcd34d"/>
      <ellipse cx="50" cy="44" rx="19" ry="21" fill="#fde68a"/>
      <!-- Classic Short Hair -->
      <path d="M31 38 C31 22 42 20 50 20 C62 20 69 25 69 38 C64 34 56 32 50 32 C40 32 34 35 31 38 Z" fill="#18181b"/>
      <!-- Friendly Smile & Eyes -->
      <circle cx="41" cy="43" r="2.2" fill="#18181b"/>
      <circle cx="59" cy="43" r="2.2" fill="#18181b"/>
      <path d="M43 53 Q50 60 57 53" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },

  'pra-bow-wo': {
    id: 'pra-bow-wo',
    name: 'Pra-Bow Wo',
    title: 'Terminal CLI & Git Command',
    color: '#f59e0b', // Amber / Orange
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="pb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#pb-bg)"/>
      <!-- Safari Khaki Shirt -->
      <path d="M18 95 C18 72 34 68 50 68 C66 68 82 72 82 95 Z" fill="#fef3c7"/>
      <!-- Head & Neck -->
      <rect x="43" y="52" width="14" height="18" rx="4" fill="#fcd34d"/>
      <ellipse cx="50" cy="44" rx="21" ry="21" fill="#fde68a"/>
      <!-- Black Peci / Cap -->
      <path d="M28 32 C28 22 36 18 50 18 C64 18 72 22 72 32 Z" fill="#09090b"/>
      <rect x="27" y="30" width="46" height="5" rx="2" fill="#18181b"/>
      <!-- Confident Eyes & Smile -->
      <circle cx="41" cy="44" r="2.5" fill="#09090b"/>
      <circle cx="59" cy="44" r="2.5" fill="#09090b"/>
      <path d="M43 54 Q50 59 57 54" fill="none" stroke="#92400e" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },

  'luh-hut': {
    id: 'luh-hut',
    name: 'Luh-Hut',
    title: 'System Architecture & Deployment',
    color: '#a855f7', // Purple
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="lh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7e22ce"/>
          <stop offset="100%" stop-color="#581c87"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#lh-bg)"/>
      <!-- Suit & Tie -->
      <path d="M20 95 C20 70 35 66 50 66 C65 66 80 70 80 95 Z" fill="#1e1b4b"/>
      <polygon points="46,66 50,88 54,66" fill="#ef4444"/>
      <!-- Head -->
      <ellipse cx="50" cy="42" rx="20" ry="22" fill="#fde68a"/>
      <!-- Executive Silver/Dark Hair -->
      <path d="M28 34 C28 18 40 16 50 16 C64 16 72 20 72 34 C64 28 54 26 50 26 C40 26 34 29 28 34 Z" fill="#334155"/>
      <!-- Sharp Look -->
      <circle cx="41" cy="41" r="2.2" fill="#0f172a"/>
      <circle cx="59" cy="41" r="2.2" fill="#0f172a"/>
      <path d="M44 52 Q50 56 56 52" fill="none" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },

  'mega-chan': {
    id: 'mega-chan',
    name: 'Mega-Chan',
    title: 'Logika & Algoritma Dasar',
    color: '#f43f5e', // Rose / Red
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="mc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e11d48"/>
          <stop offset="100%" stop-color="#9f1239"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#mc-bg)"/>
      <!-- Red/Dark Outfit -->
      <path d="M20 95 C20 72 35 68 50 68 C65 68 80 72 80 95 Z" fill="#881337"/>
      <!-- Head & Classic Hair -->
      <ellipse cx="50" cy="44" rx="20" ry="21" fill="#fde68a"/>
      <path d="M26 44 C26 22 36 18 50 18 C64 18 74 22 74 44 C76 56 70 60 70 60 C64 36 58 30 50 30 C42 30 36 36 30 60 C30 60 24 56 26 44 Z" fill="#18181b"/>
      <!-- Eyes & Dignified Expression -->
      <circle cx="41" cy="44" r="2.2" fill="#0f172a"/>
      <circle cx="59" cy="44" r="2.2" fill="#0f172a"/>
      <path d="M44 54 Q50 58 56 54" fill="none" stroke="#881337" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },

  'mah-fud': {
    id: 'mah-fud',
    name: 'Mah-Fud',
    title: 'Clean Code & Security',
    color: '#10b981', // Teal / Mint
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="mf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0d9488"/>
          <stop offset="100%" stop-color="#115e59"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#mf-bg)"/>
      <path d="M20 95 C20 72 35 68 50 68 C65 68 80 72 80 95 Z" fill="#134e4a"/>
      <ellipse cx="50" cy="43" rx="20" ry="21" fill="#fde68a"/>
      <!-- Hair & Glasses -->
      <path d="M30 34 C30 20 40 18 50 18 C64 18 70 24 70 34 C64 30 56 28 50 28 C40 28 34 30 30 34 Z" fill="#18181b"/>
      <rect x="34" y="38" width="12" height="8" rx="2" fill="none" stroke="#042f2e" stroke-width="2"/>
      <rect x="54" y="38" width="12" height="8" rx="2" fill="none" stroke="#042f2e" stroke-width="2"/>
      <circle cx="40" cy="42" r="2" fill="#042f2e"/>
      <circle cx="60" cy="42" r="2" fill="#042f2e"/>
      <path d="M44 53 Q50 57 56 53" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },

  'an-ies': {
    id: 'an-ies',
    name: 'An-Ies',
    title: 'Software Design & Narasi',
    color: '#6366f1', // Indigo
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    avatarSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="ai-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5"/>
          <stop offset="100%" stop-color="#3730a3"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#ai-bg)"/>
      <path d="M20 95 C20 72 35 68 50 68 C65 68 80 72 80 95 Z" fill="#1e1b4b"/>
      <ellipse cx="50" cy="43" rx="20" ry="21" fill="#fde68a"/>
      <!-- Neat Hair & Glasses -->
      <path d="M30 32 C30 18 40 16 50 16 C64 16 70 22 70 32 C64 28 56 26 50 26 C40 26 34 28 30 32 Z" fill="#0f172a"/>
      <rect x="34" y="38" width="12" height="8" rx="2" fill="none" stroke="#312e81" stroke-width="2.2"/>
      <rect x="54" y="38" width="12" height="8" rx="2" fill="none" stroke="#312e81" stroke-width="2.2"/>
      <circle cx="40" cy="42" r="2" fill="#0f172a"/>
      <circle cx="60" cy="42" r="2" fill="#0f172a"/>
      <path d="M43 53 Q50 58 57 53" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
};

/**
 * Normalizes persona name string to match our rich persona roster.
 */
export function getPersonaDetails(nameOrId?: string | null): PersonaConfig {
  if (!nameOrId) return PERSONA_ROSTER['gib-run'];

  const normalized = nameOrId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/^-+|-+$/g, '');

  for (const [key, cfg] of Object.entries(PERSONA_ROSTER)) {
    if (
      normalized.includes(key) ||
      key.includes(normalized) ||
      normalized.includes(cfg.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    ) {
      return cfg;
    }
  }

  // Check specific alias matches
  if (/gibran|gibrun|gib-run|satset/i.test(nameOrId)) return PERSONA_ROSTER['gib-run'];
  if (/jokowi|joke-wi|wiwi|infrastruktur/i.test(nameOrId)) return PERSONA_ROSTER['joke-wi'];
  if (/prabowo|pra-bow|bowo|jenderal|komando/i.test(nameOrId)) return PERSONA_ROSTER['pra-bow-wo'];
  if (/luhut|luh-hut|opung/i.test(nameOrId)) return PERSONA_ROSTER['luh-hut'];
  if (/megawati|mega-chan|mega/i.test(nameOrId)) return PERSONA_ROSTER['mega-chan'];
  if (/mahfud|mah-fud/i.test(nameOrId)) return PERSONA_ROSTER['mah-fud'];
  if (/anies|an-ies/i.test(nameOrId)) return PERSONA_ROSTER['an-ies'];

  // Default fallback with dynamic friendly color
  return {
    id: normalized || 'vibe-expert',
    name: nameOrId,
    title: 'Vibe Coding Specialist',
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    avatarSvg: PERSONA_ROSTER['gib-run'].avatarSvg,
  };
}
