'use client';

import { useState } from 'react';

export default function EarlyAccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        setEmail('');
      }}
    >
      <input
        type="email"
        placeholder="you@company.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">
        {submitted ? 'You’re in. Check your inbox.' : 'Request access'}
      </button>
    </form>
  );
}
