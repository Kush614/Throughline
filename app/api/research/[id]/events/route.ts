import { getResearch, researchChannel } from '@/lib/research';
import { recent, subscribe } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-Sent Events stream for one research op. Replays recent events
// from the in-memory ring, then forwards live ones.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const channel = researchChannel(id);

  // Best-effort: refuse if the record doesn't exist.
  const rec = await getResearch(id);
  if (!rec) {
    return new Response(JSON.stringify({ error: 'Research not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Hello frame so the client knows it's connected.
      send({ type: 'hello', researchId: id, status: rec.status, steps: rec.steps });

      // Replay any buffered events on this channel.
      for (const ev of recent(channel, 50)) send(ev);

      // If the op is already terminal, send a final marker and close.
      if (rec.status === 'done' || rec.status === 'error') {
        send({ type: 'sse.closing' });
        controller.close();
        return;
      }

      const unsub = subscribe(channel, (ev) => {
        send(ev);
        if (ev.type === 'research.complete' || ev.type === 'research.error') {
          send({ type: 'sse.closing' });
          try { controller.close(); } catch { /* already closed */ }
          unsub();
        }
      });

      // Keep-alive pings every 15s so proxies don't drop the connection.
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); }
        catch { clearInterval(ping); unsub(); }
      }, 15_000);

      // Tie cleanup to stream cancel.
      (controller as ReadableStreamDefaultController & { _unsub?: () => void })._unsub = () => {
        clearInterval(ping);
        unsub();
      };
    },
    cancel(reason) {
      // best-effort
      void reason;
    },
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
