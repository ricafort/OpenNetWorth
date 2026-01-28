---
description: Add a new dashboard widget to the application
---

## Steps

1. **Create widget component** in `src/components/widgets/`:
   ```
   src/components/widgets/[WidgetName]Widget.tsx
   ```
   - Use `'use client'` directive
   - Import from `@/contexts/DashboardContext` or `@/contexts/ProfileContext` as needed
   - Follow existing widget patterns (e.g., `MomentumWidget.tsx`)

2. **Register widget** in `src/lib/widgetRegistry.ts`:
   - Add to the `widgetRegistry` array with:
     - `id`: kebab-case identifier (e.g., `'my-widget'`)
     - `name`: Display name
     - `description`: Short description
     - `component`: `lazy(() => import('@/components/widgets/[WidgetName]Widget'))`
     - `defaultSize`: `{ w: 1, h: 1 }` or appropriate size
     - `category`: `'stats'`, `'charts'`, `'insights'`, or `'tools'`

3. **Add to default layouts** in `getDefaultLayout()`:
   - Add positioning for all 5 breakpoints: `lg`, `md`, `sm`, `xs`, `xxs`
   - Format: `{ i: 'widget-id', x: 0, y: 0, w: 1, h: 1 }`

// turbo
4. **Verify build**:
   ```bash
   npm run build
   ```

5. **Test manually**:
   - Run `npm run dev`
   - Check widget appears in dashboard
   - Verify drag/drop works in edit mode
