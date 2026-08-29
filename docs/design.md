# Design & Conventions

Supplementary notes for the Kleo Doc UI

## Visual design

- **Accent:** `#cc0100` — pills, eyebrows, highlights, primary buttons
- **Ink:** `#111827` — headings, text, 2px borders, hard offset shadows
- **Typography:** Nunito (sans) + Geist Mono (code)
- **Neo-brutalist details:** thick ink borders, hard offset shadows
  (`--shadow-card: 3px 3px 0 0 #111827`), pill buttons, offset hover
  (`hover:translate-x-0.5 hover:translate-y-0.5`)
- Cards, chips, the evidence modal, and the sidebar share the same border +
  shadow language so every surface reads as one system.

## UI / UX patterns

- **Mobile:** the chat sidebar becomes a full-screen overlay toggled from a slim
  top bar (☰ hamburger). Selecting a chat, tapping "New chat", or the ✕ closes
  it. Desktop keeps the fixed left sidebar.
- **Upload overview:** a "Document overview" card renders above the confirmation
  message bubble.
- **Typing indicator:** lives inside the assistant's message bubble while it
  streams, replacing the "Thinking…" dots once the first token arrives.
- **Scroll:** the message list auto-scrolls to the bottom on load and stays
  pinned while streaming, unless the user scrolls up to read history.

## Coding conventions

- Named imports from `react` (e.g. `useState`, `useEffect`) instead of the
  `React` namespace
- No `any` — prefer explicit, typed interfaces
- Server components by default; add `"use client"` only when interactivity is
  needed
- No inline code comments unless they explain non-obvious intent
