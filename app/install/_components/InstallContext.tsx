'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type RegisteredAgent = {
  id: string;
  name: string;
  from: string;
  apiKeyPrefix: string;
  workspace: string;
  createdAt: string;
};

export interface InstallContextValue {
  apiKey: string | null;        // full key, only present while it's visible
  workspace: string;
  agent: RegisteredAgent | null;
  setRegistration: (next: { agent: RegisteredAgent; apiKey: string } | null) => void;
}

const Ctx = createContext<InstallContextValue | null>(null);

export function InstallProvider({
  value,
  children,
}: {
  value: InstallContextValue;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstall(): InstallContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInstall must be used within InstallProvider');
  return v;
}

/** Resolve the API-key placeholder for display in code blocks. */
export function useResolvedKey(): string {
  const { apiKey } = useInstall();
  return apiKey ?? 'nz_live_<paste-yours>';
}

/** A one-shot substitution helper: replaces the design-doc placeholder
 *  `nz_live_x9K2…` with the actual key (or a clear "paste yours" hint)
 *  inside any rendered code-block string. Used by CodeBlock. */
export function useKeySubstitutor(): (s: string) => string {
  const { apiKey } = useInstall();
  return useMemo(() => {
    const replacement = apiKey ?? 'nz_live_<paste-yours>';
    return (s: string) => s.replaceAll('nz_live_x9K2…', replacement);
  }, [apiKey]);
}
