import type { IdeaCardData } from "@/components/idea-cards/idea-card"

export const sampleIdeas: IdeaCardData[] = [
  // REEL IDEAS - Kurze, virale Video-Formate
  {
    id: "idea-1",
    title: "Immobilien-Besichtigung mal ehrlich",
    description: "Zeige eine realistische Wohnungsbesichtigung ohne Beschönigung - mit allen kleinen Mängeln und ehrlichen Kommentaren.",
    category: "trend-reels",
    source: "trend-explorer",
    content: {
      hook: "Das zeigt dir kein Makler bei der Besichtigung!",
      script: "Walkthrough mit ehrlichen Kommentaren • Kleine Mängel zeigen • Authentische Reaktionen",
      hashtags: ["#Immobilien", "#Wohnungsbesichtigung", "#Ehrlich"],
      platforms: ["instagram", "tiktok"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "quick"
  },
  {
    id: "idea-2",
    title: "Renovierungs-Vorher-Nachher",
    description: "Kurze Transformation eines Raumes - von ungemütlich zu traumhaft in wenigen Sekunden.",
    category: "trend-reels",
    source: "trend-explorer",
    content: {
      hook: "Diese Verwandlung wird dich überraschen!",
      script: "Schnelle Schnitte • Vorher-Nachher Vergleich • Verwandlung in Sekunden",
      hashtags: ["#Renovierung", "#Transformation", "#Einrichtung"],
      platforms: ["instagram", "tiktok"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-3",
    title: "Versteckte Schätze entdecken",
    description: "Entdecke besondere Details in Wohnungen, die auf den ersten Blick nicht auffallen - von geheimen Stauräumen bis zu besonderen Aussichten.",
    category: "trend-reels",
    source: "manual",
    content: {
      hook: "Siehst du das versteckte Detail?",
      script: "Kameraführung zu versteckten Features • Überraschungsmomente • Detail-Fokus",
      hashtags: ["#Versteckt", "#Details", "#Immobilien"],
      platforms: ["instagram", "tiktok"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "quick"
  },
  {
    id: "idea-4",
    title: "Wohnungseinrichtung in 30 Sekunden",
    description: "Zeige, wie man einen leeren Raum schnell und stilvoll einrichtet - perfekt für neue Mieter oder Käufer.",
    category: "trend-reels",
    source: "trend-explorer",
    content: {
      hook: "Von leer zu gemütlich in 30 Sekunden!",
      script: "Speed-Einrichtung • Möbel platzieren • Deko arrangieren • Fertige Raumgestaltung",
      hashtags: ["#Einrichtung", "#Schnell", "#Styling"],
      platforms: ["instagram", "tiktok"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-5",
    title: "Nachbarschafts-Check",
    description: "Ein ehrlicher Rundgang durch das Viertel - Infrastruktur, Lärmbelastung und versteckte Perlen der Umgebung.",
    category: "trend-reels",
    source: "manual",
    content: {
      hook: "So ist es wirklich, hier zu wohnen!",
      script: "Rundgang durch die Nachbarschaft • Infrastruktur zeigen • Geräuschpegel testen • Lokale Tipps",
      hashtags: ["#Nachbarschaft", "#Kiez", "#Leben"],
      platforms: ["instagram", "tiktok"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "medium"
  },

  // POSTS - Längere, informative Beiträge
  {
    id: "idea-6",
    title: "Kaufratgeber für Erstkäufer",
    description: "Umfassender Guide mit allen wichtigen Schritten beim ersten Immobilienkauf - von der Finanzierung bis zum Notartermin.",
    category: "content-strategies",
    source: "content-strategy",
    content: {
      hook: "Dein Weg zur ersten eigenen Immobilie",
      script: "Mehrere Slides mit Checklisten • Finanzierungsbeispiele • Schritt-für-Schritt Anleitung",
      hashtags: ["#Erstkäufer", "#Immobilienkauf", "#Ratgeber"],
      platforms: ["instagram", "facebook", "linkedin"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-7",
    title: "Marktanalyse der Region",
    description: "Detaillierte Analyse der lokalen Immobilienpreise, Trends und Prognosen für die nächsten Jahre.",
    category: "content-strategies",
    source: "content-strategy",
    content: {
      hook: "So entwickeln sich die Preise in unserer Region",
      script: "Infografiken mit Preisvergleichen • Trendanalyse • Prognosen und Empfehlungen",
      hashtags: ["#Marktanalyse", "#Preise", "#Trends"],
      platforms: ["linkedin", "facebook", "instagram"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "complex"
  },
  {
    id: "idea-8",
    title: "Erfolgsgeschichten von Kunden",
    description: "Echte Geschichten zufriedener Kunden - wie sie ihr Traumhaus gefunden haben und was dabei wichtig war.",
    category: "content-strategies",
    source: "manual",
    content: {
      hook: "Wie Familie Müller ihr Traumhaus fand",
      script: "Interview-Format • Vor-und-Nach Fotos • Persönliche Erfahrungen teilen",
      hashtags: ["#Erfolgsgeschichte", "#Zufriedene", "#Erfahrung"],
      platforms: ["facebook", "instagram", "linkedin"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-9",
    title: "Finanzierungstipps und Tricks",
    description: "Praktische Tipps zur optimalen Finanzierung - von der Eigenkapital-Planung bis zu Fördermöglichkeiten.",
    category: "content-strategies",
    source: "content-strategy",
    content: {
      hook: "So sparst du bei der Immobilienfinanzierung",
      script: "Carousel mit Spartipps • Förderungen erklären • Beispielrechnungen zeigen",
      hashtags: ["#Finanzierung", "#Sparen", "#Förderung"],
      platforms: ["linkedin", "instagram", "facebook"]
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    tags: [],
    isImplemented: false,
    estimatedEffort: "medium"
  }
]

export const getIdeasByCategory = (category: string) => {
  if (category === 'all') return sampleIdeas
  return sampleIdeas.filter(idea => idea.category === category)
}

// Simplified category getters for the new structure
export const getReelIdeas = () => {
  return sampleIdeas.filter(idea => idea.category === 'trend-reels')
}

export const getPostIdeas = () => {
  return sampleIdeas.filter(idea => idea.category === 'content-strategies')
}

// Legacy functions kept for compatibility
export const getIdeasByPriority = (priority: string) => {
  return sampleIdeas.filter(idea => idea.priority === priority)
}

export const getImplementedIdeas = () => {
  return sampleIdeas.filter(idea => idea.isImplemented)
}

export const getQuickWinIdeas = () => {
  return sampleIdeas.filter(idea => 
    idea.estimatedEffort === 'quick' && !idea.isImplemented
  )
}

export const getTrendReels = () => {
  return sampleIdeas.filter(idea => idea.category === 'trend-reels')
}

export const getContentStrategies = () => {
  return sampleIdeas.filter(idea => idea.category === 'content-strategies')
}

export const getAIStrategies = () => {
  return sampleIdeas.filter(idea => idea.category === 'ai-strategies')
} 

// Strategy data for swipe cards
import { 
  Lightbulb, 
  Target, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  Camera,
  BarChart3,
  Heart,
  Zap,
  Globe,
  Sparkles,
  Eye,
  Map,
  Brain,
  Search,
  Play,
  Book,
  Video,
  Share2
} from 'lucide-react'

export interface StrategyData {
  id: string
  title: string
  description: string
  icon: any
  iconColor: string
  color: string
  details: {
    why: string
    example: string
    tips: string[]
  }
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  timeToImplement: string
  expectedResults: string
}

export const swipeStrategies: StrategyData[] = [
  {
    id: "strategy-1",
    title: "Authentizität statt Hochglanz",
    description: "78% der Follower misstrauen perfekt inszenierte Inhalte. Echte Einblicke steigern die Vertrauenswürdigkeit um das 3-fache.",
    icon: Heart,
    iconColor: "text-red-600",
    color: "from-red-400 to-pink-500",
    details: {
      why: "Studien zeigen: 78% der Follower misstrauen perfekt inszenierten Inhalten (Meta 2024). Echte Einblicke steigern die Vertrauenswürdigkeit um das 3-fache.",
      example: "Handyvideo mit Voiceover: 'Heute: 5 ungeschönte Makler-Momente! 👇 Um 6:30 Uhr: Kundin sagt 5 Minuten vor Besichtigungstermin ab 😅 Dokumenten-Chaos beim Notartermin (zeigt Papierstapel) Blamage: Verwechselte Haustürschlüssel bei Übergabe ... Was war EUER peinlichster Arbeitsmoment? Kommentieren!'",
      tips: [
        "Nutze Instagrams 'RAW'-Filter für bewusst unperfekte Aufnahmen",
        "Poste 'Mitarbeiter-Blooper-Reels' (z.B. verunglückte Luftschlangen-Überraschung)",
        "Zeige auch Rückschläge: 'Warum dieses Haus NACH 3 Monaten immer noch nicht verkauft ist'",
        "Verwende natürliche Beleuchtung und ungestellte Momente"
      ]
    },
    category: "authenticity",
    difficulty: "beginner",
    timeToImplement: "1-2 Wochen",
    expectedResults: "3x höhere Vertrauenswürdigkeit"
  },
  {
    id: "strategy-2",
    title: "Hyperlokale 'Kieztouren'",
    description: "Lokal-taggte Videos erhalten 170% mehr Shares. Werde zum lokalen Experten durch geheime Insider-Tipps.",
    icon: Map,
    iconColor: "text-blue-600",
    color: "from-blue-400 to-indigo-500",
    details: {
      why: "Laut TikTok-Report 2024 erhalten lokal-taggte Videos 170% mehr Shares. Nutze immer: Geotags + Stadtteil-Hashtags (#PrenzlbergImmobilien) und lokale Dialekt-Ausdrücke ('Kiez' statt 'Stadtteil').",
      example: "Instagram Reel (Sound: 'Das ist mein Berlin'): Text-Hook: 'Geheimtipps in Prenzlauer Berg, die selbst Berliner nicht kennen!' 0-3s: Zeitraffer-Fußweg durch versteckten Graffiti-Hof 4-7s: Close-up von Kaffee-Spezialität im kleinen Familiencafé 8-15s: Spielplatz-Check mit Fokus auf Sicherheitsdetails 16-20s: Schulleiter-Interview (O-Ton: 'Hier haben 92% der Kinder Gymnasialempfehlung') CTA: 'Welchen Kiez soll ich als nächstes vorstellen? 🔻'",
      tips: [
        "Verwende immer Geotags + Stadtteil-Hashtags (#PrenzlbergImmobilien)",
        "Nutze lokale Dialekt-Ausdrücke ('Kiez' statt 'Stadtteil')",
        "Zeige versteckte Gems, die nur Locals kennen",
        "Interviewe lokale Experten (Schulleiter, Café-Besitzer)"
      ]
    },
    category: "local-expertise",
    difficulty: "intermediate",
    timeToImplement: "2-3 Wochen",
    expectedResults: "170% mehr Shares bei lokalen Videos"
  },
  {
    id: "strategy-3",
    title: "KI-gestützte Personalisierung",
    description: "Nutze ChatGPT, VirtualStaging.ai und Canva Magic Design für 10x schnellere Content-Erstellung mit professionellen Ergebnissen.",
    icon: Brain,
    iconColor: "text-purple-600",
    color: "from-purple-400 to-indigo-500",
    details: {
      why: "KI-Tools ermöglichen professionelle Content-Erstellung in Minuten statt Stunden. Kombiniere verschiedene Tools für maximale Effizienz.",
      example: "Instagram-Carousel: Slide 1: Leeres Wohnzimmer-Bild 'SO sah es aus...' Slide 2: KI-eingerichtete Version '...mit 2 Klicks zum Traumambiente!' Slide 3: Disclaimer: 'Visualisierung via KI - real möblierte Besichtigung möglich'",
      tips: [
        "ChatGPT-Prompt: 'Generiere 5 Instagram-Carousel-Ideen für Münchner Erstkäufer zum Thema Überschätzte Maklerkosten mit emotionalen Hooks'",
        "VirtualStaging.ai: Hochladen leerer Raumfotos → Auswählen 'Skandinavisch-Loft-Stil'",
        "Canva Magic Design: 'Erstelle Infografik-Vergleich: Mieten vs. Kaufen in Hamburg 2024'",
        "Immer Disclaimer bei KI-generierten Inhalten hinzufügen"
      ]
    },
    category: "ai-automation",
    difficulty: "intermediate",
    timeToImplement: "1-2 Wochen",
    expectedResults: "10x schnellere Content-Erstellung"
  },
  {
    id: "strategy-4",
    title: "'Immoscout-Hacks' & Tabubrüche",
    description: "Viral-taugliche Enthüllungen: Decke überteuerte Anzeigen auf und zeige versteckte Mängel für massive Reichweite.",
    icon: Search,
    iconColor: "text-orange-600",
    color: "from-orange-400 to-red-500",
    details: {
      why: "Controversial Content generiert hohe Engagement-Raten. Menschen lieben Insider-Geheimnisse und Aufklärung über Branchen-Tricks.",
      example: "Reel-Titel: 'Warum diese 800.000€-Immoscout-Anzeige nur 720k wert ist!' Inhalt: Screenshot der Anzeige, Roter Pfeil auf versteckte Baumängel (Schimmel hinter Schrank), Vergleich mit Gutachten-Daten, CTA: 'Spart euch Fehlkäufe: Mein gratis Mängel-Check PDF 📥 [Link in Bio]'",
      tips: [
        "Nutze Screenshots echter Anzeigen (anonymisiert)",
        "Zeige Preisvergleiche mit fundierten Daten",
        "Erstelle provokante Serie: '5 Immobilien-Lügen, die alle Kollegen verschweigen'",
        "Immer konstruktive Lösungen anbieten, nicht nur kritisieren"
      ]
    },
    category: "viral-content",
    difficulty: "advanced",
    timeToImplement: "1-2 Wochen",
    expectedResults: "Hohe Viral-Reichweite, starkes Engagement"
  },
  {
    id: "strategy-5",
    title: "Kunden-Storytelling mit Emotion",
    description: "Gesichter in ersten 3 Sekunden steigern Completion Rate um 40%. Authentische Erfolgsgeschichten schaffen Vertrauen.",
    icon: Users,
    iconColor: "text-green-600",
    color: "from-green-400 to-teal-500",
    details: {
      why: "Gesichter in ersten 3 Sekunden steigern Completion Rate um 40% (Instagram 2025). Emotionale Geschichten schaffen stärkere Verbindungen als reine Fakten.",
      example: "Drehbuch für 45s-Erfolgs-Reel: 0-3s: Kunde hält Schlüssel hoch mit Tränen in den Augen 3-5s: Text-Hook: 'Wie Sarahs Traumhaus-Kauf fast scheiterte...' 5-15s: Handyvideo-Schnipsel (suchende Kundin, verzweifelter Gesichtsausdruck) 15-30s: Voiceover der Kundin: 'Nach 12 Absagen dachte ich, es klappt nie... dann entdeckte Markus DIESEN Trick!' 30-40s: Makler zeigt entscheidendes Dokument (z.B. Finanzierungsbestätigung) 40-45s: Gemeinsames Lachen vor Haustür → 'Jetzt starten WIR deine Erfolgsstory! ☎️'",
      tips: [
        "Zeige echte Emotionen in den ersten 3 Sekunden",
        "Nutze Kundenstimmen als Voiceover",
        "Dokumentiere den gesamten Kaufprozess",
        "Immer mit starkem Call-to-Action enden"
      ]
    },
    category: "storytelling",
    difficulty: "intermediate",
    timeToImplement: "2-3 Wochen",
    expectedResults: "40% höhere Completion Rate"
  },
  {
    id: "strategy-6",
    title: "Swipebare Bildungsinhalte",
    description: "Carousel-Posts mit wertvollen Tipps generieren hohe Saves und etablieren dich als Experten. Perfekt für komplexe Themen.",
    icon: Book,
    iconColor: "text-indigo-600",
    color: "from-indigo-400 to-purple-500",
    details: {
      why: "Bildungs-Content wird am häufigsten gesaved und geteilt. Carousel-Format ermöglicht detaillierte Erklärungen in digestiblen Häppchen.",
      example: "Beispiel-Carousel (6 Slides): Slide 1: '5 verbotene Renovierungen in Mietwohnungen! ➡️' Slide 2: '1. Feuchtraum-Fliesen entfernen → erfordert DENKMALGENEHMIGUNG' + Foto Slide 3: '2. Elektroinstallation ändern? Nur mit Fachbetrieb! §13 NAV' Slide 4: '3. Balkonverglasung = bauliche Veränderung = Vermieter-VETO' Slide 5: '4. ...' Slide 6: 'Sicher dir MEINE Checkliste: Renovieren ohne Ärger! ⤵️ [Link in Bio]'",
      tips: [
        "Nutze nummerierte Listen für bessere Struktur",
        "Füge relevante Gesetzesparagraphen hinzu",
        "Verwende konsistente Slide-Designs",
        "Immer mit Lead-Magnet abschließen"
      ]
    },
    category: "education",
    difficulty: "beginner",
    timeToImplement: "1-2 Wochen",
    expectedResults: "Hohe Save-Rate, Experten-Positionierung"
  },
  {
    id: "strategy-7",
    title: "Algorithmus-optimierte Video-Hooks",
    description: "Deutsche Hook-Vorlagen für maximale Aufmerksamkeit: Provokation, Dringlichkeit, Neugier und Silent-Hooks.",
    icon: Video,
    iconColor: "text-red-600",
    color: "from-red-400 to-orange-500",
    details: {
      why: "Die ersten 3 Sekunden entscheiden über Erfolg oder Misserfolg. Getestete Hook-Formeln maximieren die Viewer-Retention.",
      example: "Provokation: 'Warum 70% aller Makler dich übers Ohr hauen!' Dringlichkeit: 'STOP! Diese 3 Fehler ruinieren deinen Verkauf!' Neugier: 'Was diese Luftblasen an der Wand wirklich bedeuten...' Silent-Hook: Starker Text: 'Wenn dein Makler DAS nicht kennt → WECHSELN!'",
      tips: [
        "Teste verschiedene Hook-Typen für deine Zielgruppe",
        "Nutze Power-Wörter wie 'STOP', 'GEHEIM', 'FEHLER'",
        "Stelle kontroverse Behauptungen auf",
        "Verwende Zahlen und Statistiken für Glaubwürdigkeit"
      ]
    },
    category: "video-optimization",
    difficulty: "advanced",
    timeToImplement: "1 Woche",
    expectedResults: "Höhere Viewer-Retention, mehr Views"
  },
  {
    id: "strategy-8",
    title: "Nischen-Branding",
    description: "Nischen-Accounts haben 27% höhere Lead-Konversionsraten. Spezialisiere dich auf Luxus, Erstkäufer oder Investment.",
    icon: Target,
    iconColor: "text-purple-600",
    color: "from-purple-400 to-pink-500",
    details: {
      why: "Nischen-Accounts haben 27% höhere Lead-Konversionsraten (Immobilienwirtschaft Report 2025). Spezialisierung schafft höhere Preisbereitschaft.",
      example: "Für Luxus-Spezialisten: Reel: 'Ein Tag mit dem Concierge im Fünfsterne-Penthouse' Content-Fokus: Sicherheitstechnik, Weinlager-Temperaturen, Architekten-Interviews Für Erstkäufer: Challenge: 'So sparst du in 12 Monaten 35.000€ Eigenkapital' Serie: 'Kredit-Score Geheimnisse: Von 500 auf 650 in 90 Tagen'",
      tips: [
        "Wähle eine klar definierte Zielgruppe",
        "Entwickle spezifische Content-Kategorien",
        "Nutze Nischen-spezifische Hashtags",
        "Partnere mit Nischen-relevanten Experten"
      ]
    },
    category: "positioning",
    difficulty: "intermediate",
    timeToImplement: "3-4 Wochen",
    expectedResults: "27% höhere Lead-Konversionsraten"
  },
  {
    id: "strategy-9",
    title: "Interaktive Teaser",
    description: "Teaser mit Countdown-Stickern erhöhen die Erinnerungsrate um 65%. Schaffe Anticipation für deine Inhalte.",
    icon: Calendar,
    iconColor: "text-teal-600",
    color: "from-teal-400 to-cyan-500",
    details: {
      why: "Teaser mit Countdown-Stickern erhöhen die Erinnerungsrate um 65%. Menschen lieben Rätsel und kommen für die Auflösung zurück.",
      example: "Stories-Strategie: Tag 1: Rätsel-Poll → 'Schätzt den Mietpreis dieser Dachgeschosswohnung: Option A: 1.200€ Option B: 1.650€ Option C: 2.100€ Tag 2: Auflösung als Reel + 'Exklusive Tour um 18 Uhr!' Tag 3: 'Behind the Scenes' vom Drehtag + Live-Q&A",
      tips: [
        "Nutze Polls und Quiz-Sticker für Interaktion",
        "Setze Countdown-Timer für wichtige Reveals",
        "Teile Behind-the-Scenes Content",
        "Plane 3-tägige Teaser-Kampagnen"
      ]
    },
    category: "engagement",
    difficulty: "beginner",
    timeToImplement: "1-2 Wochen",
    expectedResults: "65% höhere Erinnerungsrate"
  },
  {
    id: "strategy-10",
    title: "Strategische Kooperationen",
    description: "Cross-Promotion mit lokalen Experten kann die Reichweite um 500% steigern. Tausche Leistungen gegen Leistungen.",
    icon: Share2,
    iconColor: "text-orange-600",
    color: "from-orange-400 to-yellow-500",
    details: {
      why: "Kooperationen ermöglichen Zugang zu neuen Zielgruppen ohne Werbekosten. Partner teilen Video in seinem Newsletter und erreichen +500% Reichweite.",
      example: "Partner: Lokaler Energieberater Format: 'LIVE-Chat: Heizkosten sparen trotz Preisboom!' Content-Flow: 0-5min: Makler erklärt wertsteigernde Dämm-Maßnahmen 5-15min: Energieberater zeigt Heizungs-Vergleichstool 15-20min: Gemeinsame Fragerunde Cross-Promotion: Partner teilt Video in seinem Newsletter (Reichweite +500%)",
      tips: [
        "Wähle Partner mit ähnlicher, aber nicht identischer Zielgruppe",
        "Plane Win-Win Kooperationen (1x Post gegen 1x Story-Erwähnung)",
        "Nutze Live-Formate für höhere Authentizität",
        "Dokumentiere alle Vereinbarungen schriftlich"
      ]
    },
    category: "partnerships",
    difficulty: "advanced",
    timeToImplement: "4-6 Wochen",
    expectedResults: "500% Reichweiten-Steigerung"
  }
]

export const getSwipeStrategies = () => {
  return swipeStrategies
}

export const getStrategiesByCategory = (category: string) => {
  if (category === 'all') return swipeStrategies
  return swipeStrategies.filter(strategy => strategy.category === category)
}

export const getStrategiesByDifficulty = (difficulty: string) => {
  return swipeStrategies.filter(strategy => strategy.difficulty === difficulty)
} 