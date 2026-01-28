---
description: Add a new database table to Supabase
---

## Steps

1. **Create migration file** in `supabase_migrations/`:
   ```
   [next-number]_[feature-name].sql
   ```
   - Follow existing naming: `15_fix_public_access.sql` → `16_[name].sql`

2. **Define the table**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.[table_name] (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
     -- your columns here
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```

3. **Enable RLS**:
   ```sql
   ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;
   ```

4. **Create RLS policies**:
   ```sql
   -- Users can only access their own data
   CREATE POLICY "Users can view own [table]" ON public.[table_name] 
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can manage own [table]" ON public.[table_name] 
     FOR ALL USING (auth.uid() = user_id);
   ```

5. **Update consolidated schema**:
   - Add table definition to `supabase_schema.sql`
   - Add RLS statements

6. **Add TypeScript type** in `src/types/index.ts`:
   ```typescript
   export interface [TypeName] {
     id: string;
     user_id: string;
     // your fields
     created_at: string;
   }
   ```

7. **Run migration**:
   - Copy SQL to Supabase SQL Editor
   - Execute

// turbo
8. **Verify build**:
   ```bash
   npm run build
   ```

## Checklist
- [ ] Table has `user_id` for RLS
- [ ] RLS is enabled
- [ ] Policies defined
- [ ] TypeScript types added
- [ ] Consolidated schema updated
