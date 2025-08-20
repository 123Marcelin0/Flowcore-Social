export type RouteItem = {
  path: string
  title: string
  icon: string
  component?: string
  toolId?: string
  visible?: boolean
}

export type RouteGroup = {
  id: string
  title: string
  base?: string
  routes: RouteItem[]
}

export type RouteManifest = {
  version: number
  defaultRoute: string
  groups: RouteGroup[]
}

export const ROUTES: RouteManifest = {
  version: 1,
  defaultRoute: "/dashboard",
  groups: [
    {
      id: "primary",
      title: "Primary",
      routes: [
        { path: "/dashboard", title: "Dashboard", icon: "Home", component: "@/app/components/dashboard-overview-optimized" },
        { path: "/calendar", title: "Calendar", icon: "Calendar", component: "@/app/components/content-hub" },
        { path: "/ai-studio", title: "AI Studio", icon: "Sparkles", component: "@/app/components/ai-studio-main" },
        { path: "/assistant", title: "AI Assistant", icon: "MessageSquare", component: "@/app/components/ai-interactions" },
        { path: "/ideas", title: "Content Ideas", icon: "Lightbulb", component: "@/app/components/content-ideas" },
        { path: "/settings", title: "Settings", icon: "Settings", component: "@/components/settings/settings-page" }
      ]
    },
    {
      id: "ai-studio",
      title: "AI Studio Tools",
      base: "/ai-studio",
      routes: [
        { path: "/ai-studio/interior-design", title: "Interior Design", icon: "Home", component: "@/app/components/ai-interior-designer", toolId: "interior-design" },
        { path: "/ai-studio/image-generation", title: "Image Generation", icon: "ImageIcon", component: "@/app/components/ai-studio-image-generator", toolId: "image-generation" },
        { path: "/ai-studio/video-edit", title: "Video Generator", icon: "VideoIcon", component: "@/app/components/ai-studio-video-generator", toolId: "video-edit" },
        { path: "/ai-studio/video-merger", title: "Video Merger", icon: "Film", component: "@/app/components/ai-studio-video-merger", toolId: "video-merger" },
        { path: "/ai-studio/video-editor", title: "Video Editor", icon: "Edit3", component: "@/components/glassmorphic-workflow-canvas", toolId: "video-editor" },
        { path: "/ai-studio/workflow-builder", title: "Workflow Builder", icon: "BezierCurve", component: "@/components/glassmorphic-workflow-canvas", toolId: "video-editor" },
        { path: "/ai-studio/content-create", title: "Content Create", icon: "FileText", component: "@/app/components/content-gallery", toolId: "content-create" }
      ]
    },
    {
      id: "workflows",
      title: "Workflows",
      routes: [
        { path: "/workflows/trend-optimization", title: "Trend Optimization", icon: "TrendingUp", component: "@/app/components/trend-optimization-workflow" },
        { path: "/workflows/content-strategy", title: "Content Strategy", icon: "Layers", component: "@/app/components/content-strategy-workflow" }
      ]
    },
    {
      id: "demos",
      title: "Demos & Labs",
      routes: [
        { path: "/content", title: "Content", icon: "FileText", component: "@/app/content/page" },
        { path: "/content-demo", title: "Content Demo", icon: "FileText", component: "@/app/content-demo/page" },
        { path: "/timeline", title: "Timeline", icon: "Clock3", component: "@/app/timeline/page" },
        { path: "/segment-editor-demo", title: "Segment Editor Demo", icon: "Scissors", component: "@/app/segment-editor-demo/page" },
        { path: "/test-db", title: "Test DB", icon: "Database", component: "@/app/test-db/page" },
        { path: "/test-content", title: "Test Content", icon: "TestTube", component: "@/app/test-content/page" }
      ]
    }
  ]
}

export const allRoutesFlat: RouteItem[] = ROUTES.groups.flatMap(g => g.routes)
