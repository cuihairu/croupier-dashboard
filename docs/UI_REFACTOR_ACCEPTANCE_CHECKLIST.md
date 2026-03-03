# UI Refactor Acceptance Checklist

This checklist is for final acceptance of the backend configuration UI refactor.

## 1) Scope to accept

- System Config: `src/pages/Operations/Configs/`
- Function Management: `src/pages/Functions/Directory/`
- Function Detail: `src/pages/Functions/`

## 2) Architecture acceptance (readability)

- [ ] Page entry is thin (`index.tsx` / `Detail.tsx`): mostly composition.
- [ ] Data/state/mutations are in hook files (`use*.ts(x)`).
- [ ] Columns/actions/tabs metadata are in schema files.
- [ ] Reusable UI blocks are split into focused components.
- [ ] Page README exists and reflects current file map.

## 3) System Config acceptance

- [ ] Toolbar filters and actions are schema-driven (`schema.tsx`).
- [ ] List table columns and versions table columns come from schema builders.
- [ ] Edit modal supports validate/save/version/diff/rollback.
- [ ] Query/reset actions work and keep behavior parity.
- [ ] `index.tsx` remains a composition layer.

## 4) Function Management acceptance

- [ ] Header actions and drawer actions are schema-driven.
- [ ] Action flags are effective: `disabledWhen` / `loadingWhen`.
- [ ] Row actions still support detail/UI/invoke behavior.
- [ ] Drawer detail and action buttons still work.
- [ ] Hook handles reload + detail fetch paths cleanly.

## 5) Function Detail acceptance

- [ ] `Detail.tsx` is composition + route-tab sync only.
- [ ] `useFunctionDetailPage.ts` owns load/save/copy/delete/permissions/route.
- [ ] `detailSchema.ts` defines tabs and header actions metadata.
- [ ] `DetailConfigTab.tsx` owns JSON/UI/Route sub-tabs.
- [ ] `DetailSections.tsx` + `DetailTabs.tsx` keep UI blocks isolated.

## 6) Action flags convention acceptance

- [ ] `disabledWhen` and `loadingWhen` are supported by common renderer.
- [ ] Flags used consistently across Assignments/Directory/Detail actions.
- [ ] Common flags are clear: `loading`, `noScope`, `noSelection`.

## 7) Regression checklist (manual)

- [ ] Assignments: select/clear/save/reload/history/clone actions.
- [ ] Operations Configs: query/reset/edit/validate/save/version/diff/rollback.
- [ ] Directory: refresh/detail/UI/invoke; drawer actions.
- [ ] Function Detail: basic/config/permissions/history/analytics/warnings tabs.
- [ ] Function Detail route config save/reset reflects in assignments view.

## 8) Build and quality gates

- [ ] `pnpm exec eslint <changed files>` passes.
- [ ] `pnpm run build` passes.
- [ ] No blocking runtime errors on key pages.

## 9) File map (quick jump)

- Migration status: `docs/PAGE_SCHEMA_MIGRATION.md`
- Assignments guide: `src/pages/Assignments/README.md`
- Configs guide: `src/pages/Operations/Configs/README.md`
- Functions guide: `src/pages/Functions/README.md`
- Directory guide: `src/pages/Functions/Directory/README.md`
