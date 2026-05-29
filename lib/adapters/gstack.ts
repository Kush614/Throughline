// GStack adapter — runs build/scaffold/spawn through a single labeled surface.
// In the hackathon build, GStack is local: claims go to file-claims.ts and
// progress is published to the in-memory bus. Wiring a real GStack runtime
// later means re-pointing these three functions, not 12 callers.

import { publish } from '../events';
import { orgChannel } from '../research';
import { releaseAllForAgent, tryClaim } from '../file-claims';

export const GSTACK_PROVIDER = 'gstack' as const;

export interface GStackClaimInput {
  orgSlug: string;
  agentId: string;
  agentName: string;
  filePath: string;
  reason: string;
}

export async function gstackClaimFile(input: GStackClaimInput) {
  return tryClaim(input);
}

export async function gstackReleaseAll(orgSlug: string, agentId: string): Promise<number> {
  return releaseAllForAgent(orgSlug, agentId);
}

export interface GStackProgressInput {
  orgSlug: string;
  docId: string;
  step: string;        // e.g. "build.scaffold"
  message: string;
}

export function gstackEmitProgress(input: GStackProgressInput): void {
  publish(orgChannel(input.orgSlug), input.step, {
    docId: input.docId, message: input.message, ts: new Date().toISOString(),
  });
}
