---
description: Debug and fix a bug in the application
---

## Steps

1. **Understand the bug**:
   - Reproduce the issue
   - Check browser console for errors
   - Note: Demo Mode vs Real Mode may have different behavior

2. **Locate the code**:
   - Use `rg` to search for relevant terms
   - Check the component rendering the buggy UI
   - Trace data flow through contexts

3. **Check common gotchas**:
   - Is it a Demo Mode issue? Check `ProfileContext.isDemoMode`
   - Is it a currency issue? Check `currencyService.ts`
   - Is it a localStorage vs Supabase issue? Check `storage.ts`

4. **Make the fix**:
   - Keep changes minimal and focused
   - Add comments explaining non-obvious fixes

// turbo
5. **Verify build**:
   ```bash
   npm run build
   ```

6. **Test the fix**:
   - Reproduce original bug steps - should be fixed
   - Test in both Demo Mode and Real Mode if applicable
   - Check related functionality didn't break

7. **Document** (if significant):
   - Add to troubleshooting section in `CONTRIBUTING.md` if common issue

## Common Debug Patterns

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| Data not loading | Demo Mode mismatch | `ProfileContext.tsx` |
| Values showing $0 | Currency conversion | `currencyService.ts` |
| Widget not rendering | Registry issue | `widgetRegistry.ts` |
| API 401/403 errors | RLS policy | Supabase dashboard |
