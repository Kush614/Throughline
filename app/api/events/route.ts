import { orgChannel } from '@/lib/research';
import { recent, subscribe } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Org-wide SSE: every research start/complete + every context.update broadcast
// to agents in this org streams through here. Used by agent activity panels.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = (url.searchParams.get('org') || '').toLowerCase();
  if (!orgSlug) {
    return new Response(JSON.stringify({ error: 'org query param required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const channel = orgChannel(orgSlug);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: 'hello', org: orgSlug });

      // Replay last 50 events on this org channel.
      for (const ev of recent(channel, 50)) send(ev);

      const unsub = subscribe(channel, (ev) => {
        try { send(ev); }
        catch { unsub(); }
      });

      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); }
        catch { clearInterval(ping); unsub(); }
      }, 15_000);

      (controller as ReadableStreamDefaultController & { _ping?: NodeJS.Timeout })._ping = ping;
    },
    cancel() { /* listener auto-cleans via send/error path */ },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
