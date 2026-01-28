---
description: Add a new page/route to the application
---

## Steps

1. **Create page directory** under `src/app/`:
   ```
   src/app/[route-name]/page.tsx
   ```
   - For nested routes: `src/app/[parent]/[child]/page.tsx`

2. **Create the page component**:
   - Server Component by default (no `'use client'`)
   - Use `'use client'` only if page needs hooks/interactivity
   - Import layout components from `@/components/`

3. **Add navigation** (if needed):
   - Update navigation in `src/components/Navigation.tsx` or sidebar
   - Add icon from `lucide-react`

4. **Handle authentication** (if protected):
   - Check auth state using `@/utils/supabase/server`
   - Redirect unauthenticated users

// turbo
5. **Verify build**:
   ```bash
   npm run build
   ```

6. **Test**:
   - Navigate to the new route
   - Verify layout renders correctly
   - Test on mobile viewport

## Notes
- App Router uses folder-based routing
- `page.tsx` = the route's content
- `layout.tsx` = shared layout wrapper
- `loading.tsx` = loading state (optional)
