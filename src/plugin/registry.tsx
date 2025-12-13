// Renderer registry for GM functions views
import React from 'react';

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
  
  // Aliases for backward compatibility
  renderers['json'] = JsonView;
  renderers['text'] = TextView;
  renderers['number'] = NumberView;
  renderers['table'] = TableView;
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
  // TODO: Implement actual pack loading when pack system is ready
  // For now, this function is a no-op since we only use built-in renderers
  return Promise.resolve();
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