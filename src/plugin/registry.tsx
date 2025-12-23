// Renderer registry for GM functions views
import React from 'react';
import { listPacks } from '@/services/croupier/packs';
import { apiUrl } from '@/utils/api';

// Renderer function type
type Renderer = (props: { data: any; options?: any }) => React.ReactNode;

// Registry of renderers
const renderers: Record<string, Renderer> = {};

// Default JSON view renderer
const JsonView: Renderer = ({ data, options }) => {
  return <pre style={{ whiteSpace: 'pre-wrap' }}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;
};

// Text view renderer
const TextView: Renderer = ({ data }) => {
  return <div>{String(data ?? '')}</div>;
};

// Number view renderer
const NumberView: Renderer = ({ data }) => {
  return <div>{Number(data ?? 0)}</div>;
};

// Table view renderer (for arrays of objects)
const TableView: Renderer = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div>No data</div>;
  }
  
  const headers = Object.keys(data[0]);
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {headers.map(header => (
            <th key={header} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {headers.map(header => (
              <td key={header} style={{ border: '1px solid #ddd', padding: '8px' }}>
                {String(row[header] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/**
 * Get a renderer by name
 * @param name Renderer name (e.g., 'json.view', 'text.view', 'table.view')
 * @returns Renderer function or null if not found
 */
export function getRenderer(name: string): Renderer | null {
  return renderers[name] || null;
}

/**
 * Register built-in renderers
 */
export function registerBuiltins(): void {
  // Register default renderers
  renderers['json.view'] = JsonView;
  renderers['text.view'] = TextView;
  renderers['number.view'] = NumberView;
  renderers['table.view'] = TableView;
  renderers['table.basic'] = TableView;
  
  // Aliases for backward compatibility
  renderers['json'] = JsonView;
  renderers['text'] = TextView;
  renderers['number'] = NumberView;
  renderers['table'] = TableView;
}

type PackPluginEntry = { packId: string; path: string; updatedAt?: string };

let pluginsLoaded = false;
let pluginsLoading: Promise<void> | null = null;

async function importPluginModule(url: string): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return import(/* webpackIgnore: true */ url);
}

function normalizePluginPath(path: string): string {
  const p = String(path || '').trim().replace(/\\/g, '/');
  return p.startsWith('/') ? p.slice(1) : p;
}

function extractPackPlugins(packsResponse: any): PackPluginEntry[] {
  const packs: any[] =
    (packsResponse?.packs && Array.isArray(packsResponse.packs) && packsResponse.packs) ||
    (packsResponse?.packages && Array.isArray(packsResponse.packages) && packsResponse.packages) ||
    (packsResponse?.manifest?.packs && Array.isArray(packsResponse.manifest.packs) && packsResponse.manifest.packs) ||
    [];

  const plugins: PackPluginEntry[] = [];
  for (const p of packs) {
    const packId = String(p?.id || '').trim();
    if (!packId) continue;
    const manifest = p?.manifest && typeof p.manifest === 'object' ? p.manifest : {};
    const updatedAt = typeof p?.updated_at === 'string' ? p.updated_at : undefined;
    const webPlugins = Array.isArray(manifest?.web_plugins) ? manifest.web_plugins : [];
    for (const rel of webPlugins) {
      const pluginPath = normalizePluginPath(String(rel || ''));
      if (!pluginPath) continue;
      plugins.push({ packId, path: pluginPath, updatedAt });
    }
  }
  return plugins;
}

/**
 * Load pack plugins from installed packs
 * Currently, no external packs are configured, so this function does nothing.
 * In the future, this will:
 * 1. Fetch available packs from the pack registry API
 * 2. Load pack-specific UI components and renderers
 * 3. Register them in the renderers registry
 *
 * @returns Promise that resolves when all pack plugins are loaded
 */
export async function loadPackPlugins(): Promise<void> {
  if (pluginsLoaded) return;
  if (pluginsLoading) return pluginsLoading;

  pluginsLoading = (async () => {
    const res: any = await listPacks();
    const plugins = extractPackPlugins(res);
    if (!plugins.length) return;

    await Promise.allSettled(
      plugins.map(async (p) => {
        const u = new URL(apiUrl('/api/v1/packs/plugin'), window.location.origin);
        u.searchParams.set('pack', p.packId);
        u.searchParams.set('path', p.path);
        if (p.updatedAt) u.searchParams.set('v', p.updatedAt);
        const token = localStorage.getItem('token');
        if (token) u.searchParams.set('token', token);

        const mod = await importPluginModule(u.toString());
        const reg = mod?.default || mod?.register || mod;
        if (typeof reg === 'function') {
          await reg({ registerRenderer, React });
        }
      }),
    );
  })()
    .catch(() => {
      // no-op: plugin loading is best-effort
    })
    .finally(() => {
      pluginsLoaded = true;
      pluginsLoading = null;
    });

  return pluginsLoading;
}

/**
 * Register a custom renderer
 * @param name Renderer name
 * @param renderer Renderer function
 */
export function registerRenderer(name: string, renderer: Renderer): void {
  renderers[name] = renderer;
}

/**
 * Unregister a renderer
 * @param name Renderer name
 */
export function unregisterRenderer(name: string): void {
  delete renderers[name];
}

/**
 * Get list of available renderer names
 */
export function getAvailableRenderers(): string[] {
  return Object.keys(renderers);
}

// Auto-register builtins when module loads
registerBuiltins();
