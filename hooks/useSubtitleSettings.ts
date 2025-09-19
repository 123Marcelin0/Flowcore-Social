import { useState } from 'react'

export interface SubtitleSettings {
  style: string
  color: string
  accentColor: string
  wordsPerCard: number
  gapThreshold: number
  minWordsPerCard: number
  maxWordsPerCard: number
  readingCpsMin: number
  readingCpsMax: number
  lineCharMax: number
  maxLines: number
  fontSize: number
  lineSpacing: number
  fontWeight: 'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy'
  uppercase: boolean
  positionY: number
  strokeWeight: 'none' | 'small' | 'medium' | 'large'
  strokeColor: string
  shadow: 'none' | 'small' | 'medium' | 'large'
  animEnabled: boolean
  keepPunctuation: boolean
  autoEmojiMode: 'auto' | 'top' | 'none'
  emojiAnimation: boolean
  gapFree: boolean
  secondColor: string
  thirdColor: string
  stagger: number
  bottomOffset: number
  animation: 'pop' | 'fade' | 'slideUp'
  wordLead: number
  wordTrail: number
  cardLinger: number
  capcutEnabled?: boolean
}

export interface SubtitleSettingsActions {
  setStyle: (value: string) => void
  setColor: (value: string) => void
  setAccentColor: (value: string) => void
  setWordsPerCard: (value: number) => void
  setGapThreshold: (value: number) => void
  setLineCharMax: (value: number) => void
  setMaxLines: (value: number) => void
  setFontSize: (value: number) => void
  setLineSpacing: (value: number) => void
  setFontWeight: (value: 'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy') => void
  setUppercase: (value: boolean) => void
  setPositionY: (value: number) => void
  setStrokeWeight: (value: 'none' | 'small' | 'medium' | 'large') => void
  setStrokeColor: (value: string) => void
  setShadow: (value: 'none' | 'small' | 'medium' | 'large') => void
  setAnimEnabled: (value: boolean) => void
  setKeepPunctuation: (value: boolean) => void
  setAutoEmojiMode: (value: 'auto' | 'top' | 'none') => void
  setEmojiAnimation: (value: boolean) => void
  setGapFree: (value: boolean) => void
  setSecondColor: (value: string) => void
  setThirdColor: (value: string) => void
  setStagger: (value: number) => void
  setBottomOffset: (value: number) => void
  setAnimation: (value: 'pop' | 'fade' | 'slideUp') => void
  setWordLead: (value: number) => void
  setWordTrail: (value: number) => void
  setCardLinger: (value: number) => void
  toggleCapcut?: () => void
}

export function useSubtitleSettings(): [SubtitleSettings, SubtitleSettingsActions] {
  const [style, setStyle] = useState<string>("default")
  const [color, setColor] = useState<string>("#ffffff")
  const [accentColor, setAccentColor] = useState<string>("#22c55e")
  const [wordsPerCard, setWordsPerCard] = useState<number>(3)
  const [gapThreshold, setGapThreshold] = useState<number>(0.08)
  const [minWordsPerCard] = useState<number>(2)
  const [maxWordsPerCard] = useState<number>(6)
  const [readingCpsMin] = useState<number>(12)
  const [readingCpsMax] = useState<number>(17)
  const [lineCharMax, setLineCharMax] = useState<number>(14)
  const [maxLines, setMaxLines] = useState<number>(3)
  const [fontSize, setFontSize] = useState<number>(28)
  const [lineSpacing, setLineSpacing] = useState<number>(1.18)
  const [fontWeight, setFontWeight] = useState<'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy'>('Heavy')
  const [uppercase, setUppercase] = useState<boolean>(false)
  const [positionY, setPositionY] = useState<number>(55)
  const [strokeWeight, setStrokeWeight] = useState<'none' | 'small' | 'medium' | 'large'>('small')
  const [strokeColor, setStrokeColor] = useState<string>('#000000')
  const [shadow, setShadow] = useState<'none' | 'small' | 'medium' | 'large'>('medium')
  const [animEnabled, setAnimEnabled] = useState<boolean>(true)
  const [keepPunctuation, setKeepPunctuation] = useState<boolean>(true)
  const [autoEmojiMode, setAutoEmojiMode] = useState<'auto' | 'top' | 'none'>('auto')
  const [emojiAnimation, setEmojiAnimation] = useState<boolean>(true)
  const [gapFree, setGapFree] = useState<boolean>(false)
  const [secondColor, setSecondColor] = useState<string>('#ffffff')
  const [thirdColor, setThirdColor] = useState<string>('#ffffff')
  const [stagger, setStagger] = useState<number>(0.02)
  const [bottomOffset, setBottomOffset] = useState<number>(8)
  const [animation, setAnimation] = useState<'pop' | 'fade' | 'slideUp'>('pop')
  const [wordLead, setWordLead] = useState<number>(0.03)
  const [wordTrail, setWordTrail] = useState<number>(0.00)
  const [cardLinger, setCardLinger] = useState<number>(1.0)
  const [capcutEnabled, setCapcutEnabled] = useState<boolean>(false)

  const settings: SubtitleSettings = {
    style,
    color,
    accentColor,
    wordsPerCard,
    gapThreshold,
    minWordsPerCard,
    maxWordsPerCard,
    readingCpsMin,
    readingCpsMax,
    lineCharMax,
    maxLines,
    fontSize,
    lineSpacing,
    fontWeight,
    uppercase,
    positionY,
    strokeWeight,
    strokeColor,
    shadow,
    animEnabled,
    keepPunctuation,
    autoEmojiMode,
    emojiAnimation,
    gapFree,
    secondColor,
    thirdColor,
    stagger,
    bottomOffset,
    animation,
    wordLead,
    wordTrail,
    cardLinger,
    capcutEnabled
  }

  const actions: SubtitleSettingsActions = {
    setStyle,
    setColor,
    setAccentColor,
    setWordsPerCard,
    setGapThreshold,
    setLineCharMax,
    setMaxLines,
    setFontSize,
    setLineSpacing,
    setFontWeight,
    setUppercase,
    setPositionY,
    setStrokeWeight,
    setStrokeColor,
    setShadow,
    setAnimEnabled,
    setKeepPunctuation,
    setAutoEmojiMode,
    setEmojiAnimation,
    setGapFree,
    setSecondColor,
    setThirdColor,
    setStagger,
    setBottomOffset,
    setAnimation,
    setWordLead,
    setWordTrail,
    setCardLinger,
    toggleCapcut: () => setCapcutEnabled(v => !v)
  }

  return [settings, actions]
}

