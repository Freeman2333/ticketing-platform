import { lazy, type ComponentType } from 'react';
import { registerRemotes, loadRemote } from '@module-federation/runtime';

// Manifest shape: { [providerName]: remoteEntryUrl }. Served from
// public/remotes-manifest.json (copied into the build as-is, see
// rspack.config.ts) so a provider's URL can change - a redeploy, a new host -
// by editing that one file, with no shell rebuild (frontend-design.md §5).
type RemotesManifest = Record<string, string>;

// Must resolve before anything calls loadRemote()/lazyProvider() - awaited in
// bootstrap.tsx before the app renders, so by the time a <Suspense> boundary
// triggers a provider load, registerRemotes() has already run with the real
// URLs from the manifest.
export async function loadProvidersManifest(): Promise<void> {
  const res = await fetch('/remotes-manifest.json');
  if (!res.ok) {
    throw new Error(`Failed to load remotes manifest: ${res.status}`);
  }
  const manifest: RemotesManifest = await res.json();

  // `type` is omitted so the federation runtime auto-detects the entry
  // format. The providers in this workspace are rspack-built and emit UMD;
  // setting `type: 'module'` here breaks them with #RUNTIME-002.
  registerRemotes(
    Object.entries(manifest).map(([name, entry]) => ({
      alias: name,
      name,
      entry,
    })),
  );
}

export function lazyProvider<Props = unknown>(
  alias: string,
  exposeName: string,
) {
  return lazy(async () => {
    const mod = await loadRemote<{ default: ComponentType<Props> }>(
      `${alias}/${exposeName}`,
    );
    return { default: mod!.default };
  });
}
