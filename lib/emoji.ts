// Lightweight keyword-to-emoji mapper. Extend as needed.

const keywordToEmoji: Array<{ keywords: string[]; emoji: string }> = [
  { keywords: ['house','home','haus','wohnung','immobilie','real estate'], emoji: '🏠' },
  { keywords: ['key','schlüssel'], emoji: '🔑' },
  { keywords: ['window','fenster','wood sash window'], emoji: '🪟' },
  { keywords: ['garden','garten','park','parkähnlich','grass','felder','wiese'], emoji: '🌿' },
  { keywords: ['bedroom','schlafzimmer','bed'], emoji: '🛏️' },
  { keywords: ['kitchen','küche','cook'], emoji: '👩‍🍳' },
  { keywords: ['city','stadt','stadtteil','skyline'], emoji: '🌆' },
  { keywords: ['train','bahn','station'], emoji: '🚆' },
  { keywords: ['car','auto','parkplatz','garage'], emoji: '🚗' },
  { keywords: ['school','schule'], emoji: '🏫' },
  { keywords: ['shopping','laden','supermarkt'], emoji: '🛍️' },
  { keywords: ['view','blick','aussicht'], emoji: '👀' },
  { keywords: ['lake','see','river','rhein'], emoji: '🌊' },
  { keywords: ['modern','neu','renoviert'], emoji: '✨' },
]

export function findBestEmoji(query: string): string | null {
  if (!query) return null
  const q = query.toLowerCase()
  for (const row of keywordToEmoji) {
    if (row.keywords.some(k => q.includes(k))) return row.emoji
  }
  // simple fallback: return a sparkle for generic positive
  if (/sch\w+|modern|neu|toll|super|great|nice|fresh|clean|bright/.test(q)) return '✨'
  return null
}





