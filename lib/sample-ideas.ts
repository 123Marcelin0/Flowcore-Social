import type { IdeaCardData } from "@/components/idea-cards/idea-card"

export const sampleIdeas: IdeaCardData[] = [
  // TREND REELS - Popular viral formats and trending themes
  {
    id: "idea-1",
    title: "Immoscout-Hacks entlarven",
    description: "Viral format: Deconstruct overpriced listings and reveal hidden property flaws for massive engagement.",
    category: "trend-reels",
    source: "trend-explorer",
    content: {
      hook: "Warum diese 800k€-Immoscout-Anzeige nur 720k wert ist!",
      script: "Split-screen: Listing vs. Reality • Red arrows pointing to issues • Quick price breakdown",
      hashtags: ["#ImmoscoutHacks", "#MaklerSecrets", "#WohnungssuchteTipps"],
      platforms: ["tiktok", "instagram", "youtube"],
      estimatedReach: 15000
    },
    priority: "high",
    savedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tags: ["viral", "trending", "expose"],
    isImplemented: true,
    implementedPostId: "post-123",
    estimatedEffort: "quick"
  },
  {
    id: "idea-2",
    title: "Before/After Renovierungs-Hacks",
    description: "Trending transformation format: Quick DIY fixes that add 20k+ value to properties.",
    category: "trend-reels",
    source: "trend-explorer",
    content: {
      hook: "Diese 3 Tricks steigern den Wert um 20.000€!",
      script: "Fast transitions • Split screen before/after • Cost overlay • ROI calculator",
      hashtags: ["#RenovierungsHacks", "#PropertyValue", "#DIYTricks"],
      platforms: ["tiktok", "instagram"],
      estimatedReach: 12000
    },
    priority: "high",
    savedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    tags: ["transformation", "value", "diy"],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-3",
    title: "Geheime Makler-Tricks",
    description: "Behind-the-scenes secrets: What realtors don't tell you during viewings.",
    category: "trend-reels",
    source: "manual",
    content: {
      hook: "5 Dinge, die dein Makler dir NICHT sagt!",
      script: "Hidden camera style • Quick reveals • Text overlays with shocking facts",
      hashtags: ["#MaklerSecrets", "#ImmobilienWahrheit", "#WohnungskaufTipps"],
      platforms: ["tiktok", "instagram"],
      estimatedReach: 8500
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ["secrets", "insider", "education"],
    isImplemented: false,
    estimatedEffort: "quick"
  },

  // CONTENT STRATEGIES - Long-term tactics and best practices
  {
    id: "idea-4",
    title: "Hyper-Local Neighborhood Series",
    description: "Strategic content series: Deep-dive local area guides to establish geographical authority.",
    category: "content-strategies",
    source: "content-strategy",
    content: {
      hook: "Prenzlauer Berg secrets locals don't share",
      script: "Weekly format • School ratings • Transport links • Hidden gems • Price trends",
      hashtags: ["#BerlinKiez", "#Prenzlberg", "#LocalExpert"],
      platforms: ["instagram", "linkedin", "youtube"],
      targetAudience: "Local property buyers and investors",
      estimatedReach: 3500
    },
    priority: "high",
    savedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    tags: ["local", "authority", "series"],
    isImplemented: false,
    estimatedEffort: "complex"
  },
  {
    id: "idea-5",
    title: "Client Success Story Framework",
    description: "Systematic approach: Document and share authentic buyer journeys to build trust.",
    category: "content-strategies",
    source: "manual",
    content: {
      hook: "How Sarah found her dream home after 12 rejections",
      script: "3-part series • Challenge → Solution → Result • Real client testimonials",
      hashtags: ["#ClientSuccess", "#RealStories", "#TrustBuilding"],
      platforms: ["linkedin", "facebook", "instagram"],
      targetAudience: "First-time buyers",
      estimatedReach: 2200
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    tags: ["testimonial", "trust", "framework"],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-6",
    title: "Educational Content Pillars",
    description: "Strategic content mix: Finance tips, legal advice, market insights to position as expert.",
    category: "content-strategies",
    source: "content-strategy",
    content: {
      hook: "5 financing myths that cost you thousands",
      script: "Weekly carousel posts • Myth vs Reality format • Data-backed insights",
      hashtags: ["#PropertyEducation", "#FinanceMyths", "#ExpertAdvice"],
      platforms: ["linkedin", "instagram"],
      targetAudience: "Serious property investors",
      estimatedReach: 1800
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    tags: ["education", "authority", "finance"],
    isImplemented: false,
    estimatedEffort: "medium"
  },

  // AI STRATEGIES - AI tools and automated techniques
  {
    id: "idea-7",
    title: "ChatGPT Content Automation",
    description: "AI workflow: Generate 30 days of social media content in 1 hour using optimized prompts.",
    category: "ai-strategies",
    source: "ai-generated",
    content: {
      script: "Custom GPT prompts for: Market updates • Property descriptions • Engagement posts",
      hashtags: ["#AIContent", "#ContentAutomation", "#ChatGPT"],
      platforms: ["linkedin", "instagram"],
      estimatedReach: 1200
    },
    priority: "high",
    savedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ["automation", "gpt", "efficiency"],
    isImplemented: true,
    implementedPostId: "post-789",
    estimatedEffort: "quick"
  },
  {
    id: "idea-8",
    title: "AI Virtual Staging Pipeline",
    description: "Automated system: Transform empty properties into furnished showpieces using AI tools.",
    category: "ai-strategies",
    source: "ai-generated",
    content: {
      script: "Tools: VirtualStaging.ai + Canva Magic Design • Workflow for bulk processing",
      hashtags: ["#VirtualStaging", "#PropTech", "#AIDesign"],
      platforms: ["instagram", "linkedin"],
      estimatedReach: 2800
    },
    priority: "medium",
    savedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tags: ["staging", "automation", "visual"],
    isImplemented: false,
    estimatedEffort: "medium"
  },
  {
    id: "idea-9",
    title: "Smart Hashtag Optimization",
    description: "AI-powered hashtag research and rotation system for maximum organic reach.",
    category: "ai-strategies",
    source: "ai-generated",
    content: {
      hashtags: [
        "#PropTech2025", "#AIMarketing", "#SmartHashtags", "#ContentOptimization",
        "#SocialMediaAI", "#DigitalRealEstate", "#AutomatedMarketing"
      ],
      platforms: ["instagram", "tiktok", "linkedin"],
      estimatedReach: 950
    },
    priority: "high",
    savedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    lastModified: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    tags: ["hashtags", "optimization", "reach"],
    isImplemented: false,
    estimatedEffort: "quick"
  }
]

export const getIdeasByCategory = (category: string) => {
  if (category === 'all') return sampleIdeas
  return sampleIdeas.filter(idea => idea.category === category)
}

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

// Category-specific getters for the new structure
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
  Sparkles
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
    title: "Storytelling-Framework",
    description: "Verwandle deine Immobilien-Posts in emotionale Geschichten, die deine Zielgruppe fesseln und zum Handeln bewegen.",
    icon: Lightbulb,
    iconColor: "text-yellow-600",
    color: "from-yellow-400 to-orange-500",
    details: {
      why: "Menschen kaufen Emotionen, nicht nur Immobilien. Geschichten schaffen emotionale Verbindungen und bleiben länger im Gedächtnis als reine Fakten.",
      example: "Statt: '3-Zimmer-Wohnung, 85m², renoviert' → 'Familie Weber verwandelte diese Wohnung in ihr Traumzuhause. Hier backten die Kinder zum ersten Mal Plätzchen in der neuen Küche...'",
      tips: [
        "Nutze die 'Problem-Lösung-Transformation' Struktur",
        "Erzähle echte Kunden-Success-Stories",
        "Verwende emotionale Trigger-Wörter",
        "Baue Spannung mit Cliffhangern auf"
      ]
    },
    category: "content-creation",
    difficulty: "beginner",
    timeToImplement: "1-2 Wochen",
    expectedResults: "40-60% mehr Engagement"
  },
  {
    id: "strategy-2",
    title: "Lokal-Experte Positionierung",
    description: "Etabliere dich als DER Immobilien-Experte in deiner Region durch hyper-lokalen Content und Insider-Wissen.",
    icon: Target,
    iconColor: "text-blue-600",
    color: "from-blue-400 to-indigo-500",
    details: {
      why: "Kunden vertrauen lokalen Experten mehr. 89% der Käufer bevorzugen Makler mit nachweislichem lokalen Fachwissen.",
      example: "Wöchentliche 'Kiez-Geheimnisse' Serie: 'Die 5 besten Cafés in Prenzlauer Berg, die nur Locals kennen' + Immobilienpreise in der Nähe",
      tips: [
        "Erstelle Stadtteil-spezifische Content-Serien",
        "Teile lokale News und deren Immobilien-Impact",
        "Nutze lokale Hashtags und Location-Tags",
        "Vernetze dich mit lokalen Businesses"
      ]
    },
    category: "positioning",
    difficulty: "intermediate",
    timeToImplement: "3-4 Wochen",
    expectedResults: "Mehr lokale Anfragen, höhere Conversion"
  },
  {
    id: "strategy-3",
    title: "Social Proof Sammlung",
    description: "Baue systematisch Vertrauen auf durch strategisches Sammeln und Präsentieren von Kundenbewertungen.",
    icon: Users,
    iconColor: "text-green-600",
    color: "from-green-400 to-teal-500",
    details: {
      why: "92% der Verbraucher vertrauen Empfehlungen von anderen mehr als Werbung. Social Proof reduziert Kaufhemmungen drastisch.",
      example: "Monatliche 'Kunde des Monats' Posts mit Video-Testimonials, Before/After der Wohnungssuche, und deren Erfolgsgeschichte",
      tips: [
        "Bitte jeden zufriedenen Kunden um ein Video-Testimonial",
        "Sammle Screenshots von positiven Messages",
        "Erstelle Case Studies von erfolgreichen Verkäufen",
        "Nutze Google-Bewertungen in deinen Posts"
      ]
    },
    category: "trust-building",
    difficulty: "beginner",
    timeToImplement: "2-3 Wochen",
    expectedResults: "25-40% höhere Vertrauensrate"
  },
  {
    id: "strategy-4",
    title: "Trend-Jacking System",
    description: "Nutze aktuelle Trends und viralen Content für maximale Reichweite, ohne deine Professionalität zu verlieren.",
    icon: TrendingUp,
    iconColor: "text-purple-600",
    color: "from-purple-400 to-pink-500",
    details: {
      why: "Trend-Content kann 500-1000% mehr Reichweite generieren. Der Trick liegt darin, Trends professionell zu adaptieren.",
      example: "Nutze den 'Get Ready With Me' Trend → 'Get Ready for a House Viewing With Me' - zeige Vorbereitung auf Besichtigungen",
      tips: [
        "Folge Trend-Accounts und identifiziere passende Formate",
        "Adaptiere Trends immer an deine Zielgruppe",
        "Reagiere schnell - Trends haben kurze Lebensdauer",
        "Messe Performance und verdopple erfolgreiche Formate"
      ]
    },
    category: "growth",
    difficulty: "advanced",
    timeToImplement: "1 Woche",
    expectedResults: "200-500% mehr Reichweite bei Trend-Posts"
  },
  {
    id: "strategy-5",
    title: "Content-Recycling Workflow",
    description: "Maximiere deine Content-Effizienz durch systematisches Wiederverwenden und Neuaufbereiten deiner besten Inhalte.",
    icon: BarChart3,
    iconColor: "text-orange-600",
    color: "from-orange-400 to-red-500",
    details: {
      why: "80% deiner Follower sehen nur 20% deiner Posts. Content-Recycling ist der effizienteste Weg, mehr Reichweite mit weniger Aufwand zu erzielen.",
      example: "Ein erfolgreicher 'Immobilien-Tipp' Post wird zu: Instagram Reel, LinkedIn Artikel, TikTok Video, Story-Serie, Newsletter-Content",
      tips: [
        "Identifiziere deine Top 20% performing Posts",
        "Erstelle verschiedene Formate für verschiedene Plattformen",
        "Warte 3-6 Monate vor dem Recycling",
        "Aktualisiere Daten und füge neue Insights hinzu"
      ]
    },
    category: "efficiency",
    difficulty: "intermediate",
    timeToImplement: "2 Wochen",
    expectedResults: "50% weniger Content-Aufwand, gleiche Reichweite"
  },
  {
    id: "strategy-6",
    title: "Community Building Hub",
    description: "Verwandle deine Social Media Präsenz in eine aktive Community von Immobilien-Interessierten.",
    icon: MessageSquare,
    iconColor: "text-teal-600",
    color: "from-teal-400 to-cyan-500",
    details: {
      why: "Communities haben 5x höhere Engagement-Raten und generieren qualifiziertere Leads durch Vertrauen und Interaktion.",
      example: "Wöchentliche 'Immobilien Q&A' Sessions, exklusive Markt-Updates für Community-Mitglieder, Verlosungen für Beratungstermine",
      tips: [
        "Antworte innerhalb von 2 Stunden auf Kommentare",
        "Stelle regelmäßig Fragen an deine Community",
        "Erstelle exklusiven Content für engagierte Follower",
        "Organisiere virtuelle Events und Webinare"
      ]
    },
    category: "engagement",
    difficulty: "intermediate",
    timeToImplement: "4-6 Wochen",
    expectedResults: "300% mehr qualifizierte Leads"
  },
  {
    id: "strategy-7",
    title: "AI-Content Automation",
    description: "Nutze KI-Tools für 10x schnellere Content-Erstellung ohne Qualitätsverlust.",
    icon: Zap,
    iconColor: "text-violet-600",
    color: "from-violet-400 to-purple-500",
    details: {
      why: "KI kann 80% der Content-Produktion automatisieren, während du dich auf Strategie und Kundenbetreuung konzentrierst.",
      example: "ChatGPT für Post-Texte, Canva AI für Designs, Loom für Video-Scripts, Buffer für Posting-Automation",
      tips: [
        "Erstelle Templates für wiederkehrende Content-Typen",
        "Nutze AI für erste Entwürfe, editiere für deine Stimme",
        "Automatisiere Posting-Zeiten basierend auf Analytics",
        "Verwende AI für A/B-Testing von Headlines"
      ]
    },
    category: "automation",
    difficulty: "advanced",
    timeToImplement: "3-4 Wochen",
    expectedResults: "90% weniger Content-Zeit, konsistente Qualität"
  },
  {
    id: "strategy-8",
    title: "Behind-the-Scenes Transparenz",
    description: "Baue Vertrauen und Persönlichkeit auf durch authentische Einblicke in deinen Makler-Alltag.",
    icon: Camera,
    iconColor: "text-pink-600",
    color: "from-pink-400 to-rose-500",
    details: {
      why: "Menschen kaufen von Menschen. Behind-the-Scenes Content humanisiert deine Marke und schafft emotionale Verbindungen.",
      example: "'Tag im Leben eines Maklers' Videos, Besichtigungs-Vorbereitung, Verhandlungs-Tipps, auch mal ehrliche Fails und Learnings",
      tips: [
        "Zeige sowohl Erfolge als auch Herausforderungen",
        "Teile praktische Tipps aus deinem Berufsalltag",
        "Nutze Stories für spontane, authentische Momente",
        "Erkläre komplexe Immobilien-Prozesse verständlich"
      ]
    },
    category: "authenticity",
    difficulty: "beginner",
    timeToImplement: "1 Woche",
    expectedResults: "Höhere Vertrauensrate, persönlichere Kundenbeziehungen"
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