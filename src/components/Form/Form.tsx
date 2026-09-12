"use client";

import { useState } from 'react';
import { Container, ContainerSucces } from './styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Form() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const validEmail = EMAIL_RE.test(email);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Opens the visitor's mail client pre-filled with the message.
    // Replace this handler with your own form endpoint to collect submissions.
    const mailto = `mailto:shahabahmed3339@gmail.com?subject=${encodeURIComponent(
      `Portfolio contact from ${email}`,
    )}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
    setSent(true);
  }

  if (sent) {
    return (
      <ContainerSucces>
        <h3>Thanks for getting in touch!</h3>
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          Back to the top
        </button>
      </ContainerSucces>
    )
  }

  return (
    <Container>
      <h2>Get in touch using the form</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <textarea
          required
          placeholder="Send a message to get started."
          id="message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" disabled={!validEmail || !message}>
          Submit
        </button>
      </form>
    </Container>
  )
}
