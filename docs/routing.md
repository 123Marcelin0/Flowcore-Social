# Routing and Navigation

This app uses Next.js App Router with a manifest-driven routing model.

- Single source of truth: `docs/ROUTE_PLAN.json` and `src/routes/manifest.ts`
- Sidebar and AI Tools bar consume the manifest for links and active state
- Pages live under `app/(routed)/**`

## Manifest structure

See `docs/ROUTE_PLAN.json` and `src/routes/manifest.ts`.

Groups: `primary`, `ai-studio`, `workflows`, `demos`. Each `RouteItem` has `path`, `title`, `icon`, optional `toolId`.

## Layout

- Global: `app/layout.tsx`
- Routed segment layout: `app/(routed)/layout.tsx` wraps pages with `AppShell` which renders `components/app-nav-sidebar.tsx`.
- AI Studio sublayout: `app/(routed)/ai-studio/layout.tsx` applies background classes per tool.

## Key routes

- `/dashboard`, `/calendar`, `/assistant`, `/ideas`, `/settings`
- `/ai-studio` redirects to `/ai-studio/interior-design` by default
- AI Studio tools: `/ai-studio/interior-design`, `/ai-studio/image-generation`, `/ai-studio/video-edit`, `/ai-studio/video-merger`, `/ai-studio/video-editor`, `/ai-studio/content-create`
- Demos remain accessible (`/glassmorphic-workflow`, etc.)

## Migration plan

1. Keep the old `app/dashboard/page.tsx` using `ClientPageRoot` as a fallback.
2. Add routed pages under `app/(routed)/**` mapping existing UI surfaces to stable routes.
3. Update the sidebar (`components/app-nav-sidebar.tsx`) to use the manifest for navigation, enabling deep links and refresh.
4. Update the AI Tools bar to navigate to `/ai-studio/:tool` (deeplinkable) while preserving the in-page behavior during migration.
5. Gradually remove sections from `ClientPageRoot` once confirmed working on routed pages.
6. Redirect `/` to `/dashboard` in the landing nav and optionally move landing to `/landing`.
7. Add `app/not-found.tsx` and `app/error.tsx` which are included.
8. Encode key view state in URLs as query parameters where applicable.

## Adding a new page

1. Add to `src/routes/manifest.ts` and `docs/ROUTE_PLAN.json`.
2. Create `app/(routed)/your-path/page.tsx` and render the component.
3. If it is an AI Studio tool, add a `toolId` and a page under `app/(routed)/ai-studio/:tool/page.tsx`.

## Testing

Add Vitest tests for navigation, active state, and accessibility (skip link present, ARIA attributes on active items).


