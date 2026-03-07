export type WorkspaceTelemetryEvent =
  | 'workspace_page_open'
  | 'workspace_load'
  | 'workspace_load_error'
  | 'workspace_render_error'
  | 'workspace_save'
  | 'workspace_save_error'
  | 'workspace_publish'
  | 'workspace_publish_error'
  | 'workspace_unpublish'
  | 'workspace_unpublish_error'
  | 'workspace_template_apply'
  | 'workspace_template_apply_error'
  | 'workspace_versions_load'
  | 'workspace_versions_load_error'
  | 'workspace_rollback'
  | 'workspace_rollback_error';

export function trackWorkspaceEvent(event: WorkspaceTelemetryEvent, payload?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const detail = { event, payload, ts: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent('croupier:workspace', { detail }));
  } catch {
    // Ignore telemetry failures
  }
  if (process.env.NODE_ENV !== 'production') {
    console.info('[workspace]', detail);
  }
}
