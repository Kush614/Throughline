'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="confirm">
        <button
          className="rev confirm-yes"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await fetch(`/api/agents/${id}`, { method: 'DELETE' });
              router.refresh();
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
        >
          {busy ? 'revoking…' : 'confirm'}
        </button>
        <button className="rev confirm-no" type="button" onClick={() => setConfirming(false)} disabled={busy}>
          cancel
        </button>
      </span>
    );
  }

  return (
    <button className="rev" type="button" onClick={() => setConfirming(true)}>
      revoke
    </button>
  );
}
