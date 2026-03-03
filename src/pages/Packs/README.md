# Packs Page Quick Map

Read this page in this order:

1. `index.tsx`
   - Page composition only.
2. `usePacksPage.tsx`
   - All state, loading, mutations, schema action wiring.
3. `schema.ts` + `columns.tsx`
   - Table columns and toolbar behavior configuration.
4. UI blocks:
   - `StatsRow.tsx`
   - `OverviewCard.tsx`
   - `PackDetailDrawer.tsx`
   - `VersionHistoryModal.tsx`
   - `UploadPackModal.tsx`
   - `CanaryModal.tsx`

Rule:

- Keep data/behavior in hook.
- Keep `index.tsx` focused on composition.
