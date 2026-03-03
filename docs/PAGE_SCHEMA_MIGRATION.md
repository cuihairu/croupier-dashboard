# Page Schema Migration (Current Status)

## What is done

- Added reusable page renderer core:
  - `src/components/page-schema/PageSchemaRenderer.tsx`
  - `src/components/page-schema/icons.tsx`
- Fully schema-driven **Assignments** page:
  - Columns: `listColumns`, `categoryColumns`, `routeColumns`
  - Actions: `listToolbar`, `categoryActions`, `rowActions`, header `actions`
  - Action flags: `disabledWhen` / `loadingWhen`
  - Tabs/stats metadata
- Partially schema-driven **Functions Directory** page:
  - Header actions schema
  - Drawer actions schema
  - Table columns and row actions schema
  - Header action flags (`disabledWhen` / `loadingWhen`) enabled
- Refactored **Packs** page into hook + schema + modular UI blocks:
  - `usePacksPage.tsx` owns state and actions
  - `schema.ts` + `columns.tsx` own table/action metadata
  - detail/history/upload/canary split to dedicated components
- Refactored **Operations / Configs** page:
  - `useConfigsPage.ts` owns load/save/version/diff/rollback workflow
  - `schema.tsx` owns toolbar/options and table columns metadata
  - `index.tsx` kept as thin UI composition
  - `diff.tsx` provides fallback diff renderer + language mapper
- Refined **Functions / Detail** page readability:
  - Data/actions moved to `useFunctionDetailPage.ts`
  - Page tab/action metadata moved to `detailSchema.ts`
  - Header actions now support schema-driven `loadingWhen/disabledWhen`
  - Config tab extracted to `DetailConfigTab.tsx`
  - Basic/Permissions/JSON sections extracted to `DetailSections.tsx`
  - History/Analytics/Warnings tabs extracted to `DetailTabs.tsx`
  - `Detail.tsx` stays as page-level composition/state hub

## Next page migration recipe

1. Create `schema.ts` for the page (columns/actions/tabs/stats).
2. Build `columns.tsx` using schema keys, keep renderers in one place.
3. Use `renderSchemaActions` for `PageContainer.extra` actions.
4. If page has tabs/stats, use `PageSchemaRenderer`.
5. Keep API/data logic in `index.tsx`, keep UI structure in renderer.

## Current quick maps

- Assignments: `src/pages/Assignments/README.md`
- Packs: `src/pages/Packs/README.md`
- Functions Directory: `src/pages/Functions/Directory/README.md`
- Operations Configs: `src/pages/Operations/Configs/README.md`
- Functions pages: `src/pages/Functions/README.md`
- Acceptance checklist: `docs/UI_REFACTOR_ACCEPTANCE_CHECKLIST.md`
- Final report: `docs/UI_REFACTOR_FINAL_REPORT.md`

## Current benefits

- Most UI text, button visibility, and action behavior moved to schema.
- Lower JSX complexity in page entry files.
- Safer iteration for backend config UI (change schema first, not page layout code).

## Action flags convention

- `disabledWhen`: disable action when any referenced context flag is true.
- `loadingWhen`: show loading state when referenced context flag is true.
- Recommended shared flags:
  - `loading`
  - `noScope`
  - `noSelection`
