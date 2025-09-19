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
  // Expanded palette for variety
  const palette = [
    '✨','⚡','🔥','💥','🌟','⭐','🌈','💫','🎯','🚀','🏆','💡','🎉','🧠','📈','💸','🛠️','🧰','🧩','🧪','🔧','🔬','🎵','🎶','🎥','📸','🎬','🎙️','🎧','📚','✍️','📝','📰','🗺️','📌','📍','🔔','🔒','🔓','🧲','🪄','🧨','🎁','🍀','🪙','💎','🏃','🏁','👀','👍','👏','🙌','🤝','🤩','😮','😎','🤔','🤗','🤑','🤯'
  ]
  // Broader generic matches to bias selection
  const rules: Array<[RegExp, string[]]> = [
    [/(love|like|heart|care|favorite)/, ['❤️','💖','💘','💞']],
    [/(money|profit|cash|sale|deal)/, ['💸','💰','🪙','📈']],
    [/(fire|hot|trend|viral|spicy)/, ['🔥','⚡','💥','✨']],
    [/(idea|light|think|insight|tip)/, ['💡','🧠','✨']],
    [/(star|amazing|great|best|top)/, ['🌟','⭐','🏆','🎯']],
    [/(wow|shock|surprise|boom)/, ['🤯','😮','🤩','🎉']],
    [/(rocket|grow|fast|boost)/, ['🚀','📈','⚡','🏁']],
    [/(check|done|win|success|ok)/, ['✅','🏆','👏','🙌']],
    [/(time|soon|late|deadline)/, ['⏱️','⌛','🕒','🕓']],
    [/(camera|video|record|film)/, ['🎥','🎬','📸','🎙️']],
    [/(music|sound|song|beat)/, ['🎵','🎶','🎧','🎼']],
    [/(learn|read|book|study)/, ['📚','📝','✍️','🧪']],
    [/(map|location|place|track)/, ['📍','📌','🗺️','🔔']]
  ]
  for (const [re, choices] of rules) {
    if (re.test(q)) return choices[Math.floor(Math.random() * choices.length)]
  }
  return palette[Math.floor(Math.random() * palette.length)]
}







