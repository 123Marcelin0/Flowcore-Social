export type MockMedia = {
  id: string
  kind: "photo" | "video"
  src: string
  label: string
  poster?: string
}

export const MOCK_MEDIA: MockMedia[] = [
  // Photos (placeholder generator with clear queries)
  {
    id: "p1",
    kind: "photo",
    src: "/placeholder.svg?height=720&width=1080",
    label: "Mountain Lake",
  },
  {
    id: "p2",
    kind: "photo",
    src: "/placeholder.svg?height=720&width=1080",
    label: "City Nights",
  },
  {
    id: "p3",
    kind: "photo",
    src: "/placeholder.svg?height=720&width=1080",
    label: "Forest Path",
  },
  {
    id: "p4",
    kind: "photo",
    src: "/placeholder.svg?height=720&width=1080",
    label: "Desert Dunes",
  },
  {
    id: "p5",
    kind: "photo",
    src: "/placeholder.svg?height=720&width=1080",
    label: "Coastal Cliffs",
  },
  {
    id: "p6",
    kind: "photo",
    src: "/placeholder.svg?height=720&width=1080",
    label: "Snow Peak",
  },

  // Short videos (stable public samples, with posters)
  {
    id: "v1",
    kind: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "/placeholder.svg?height=720&width=1080",
    label: "Flower",
  },
  {
    id: "v2",
    kind: "video",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "/placeholder.svg?height=720&width=1080",
    label: "Petal Macro",
  },
]
