# Page Schema Migration (Current Status)

## What is done

- Added reusable page renderer core:
  - `src/components/page-schema/PageSchemaRenderer.tsx`
  - `src/components/page-schema/icons.tsx`
- Fully schema-driven **Assignments** page:
  - Columns: `listColumns`, `categoryColumns`, `routeColumns`
  - Actions: `listToolbar`, `categoryActions`, `rowActions`, header `actions`
  - Tabs/stats metadata
- Partially schema-driven **Functions Directory** page:
  - Header actions schema
  - Drawer actions schema
  - Table columns and row actions schema

## Next page migration recipe

1. Create `schema.ts` for the page (columns/actions/tabs/stats).
2. Build `columns.tsx` using schema keys, keep renderers in one place.
3. Use `renderSchemaActions` for `PageContainer.extra` actions.
4. If page has tabs/stats, use `PageSchemaRenderer`.
5. Keep API/data logic in `index.tsx`, keep UI structure in renderer.

## Current benefits

- Most UI text, button visibility, and action behavior moved to schema.
- Lower JSX complexity in page entry files.
- Safer iteration for backend config UI (change schema first, not page layout code).
