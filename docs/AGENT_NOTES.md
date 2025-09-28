# Agent Notes

## 2025-09-28 – Streaming stabilisation for instant chats
- Context: resolve "Chat not found" and 500s when streaming POST /api/v1/chats/{chat_id}/messages after instant chat creation.
- Backend:
  - Pre-create assistant placeholder messages (MessageService.create_assistant_placeholder) so SSE has a target to observe.
  - Pass placeholder ids through ChatPipeline -> tasks.generate_ai_response; reuse existing placeholder when dispatching, reset status/content, and tolerate skipped AI dispatch when OPENROUTER_API_KEY is missing by emitting completion events.
  - Replace async StreamingHttpResponse generator with synchronous SSE loop (stream_ai_response) compatible with Django 4.2 (no hop-by-hop headers), enriched with initial payloads (user + assistant snapshot) and timeout/skip handling.
  - Serialize Ninja schemas via model_dump() to avoid Pydantic deprecation floods and guarantee CORS headers on both JSON + SSE flows.
  - Promote gpt-4o-mini as the default model across chat creation paths and alias resolver.
- Frontend:
  - Rework useInstantChat SSE handler with typed events, JSON parsing safeguards, and cache reconciliation via normalizeMessage to replace optimistic records and stream deltas without shuffling message order; keep verbose debug logs for streaming lifecycle.
  - Normalize attachments from API regardless of snake_case / camelCase naming.
- Follow-ups: verify OpenRouter streaming end-to-end once credentials available; consider persisting assistant error details on frontend ChatMessage structure if user UX needs it.

## 2025-09-29 – Frontend chat optimistic flow cleanup
- Migrated `/chat/[chatId]` page to TanStack Query data sources with shared SSE parsing helper, preserving optimistic cache entries and removing redundant local state/duplicate POSTs on refresh.
- Wired `/chat` landing to `useInstantChat` for immediate optimistic navigation and deleted stale instant chat hook variants.
- Added reusable `chat-stream` helper and extended `useChatHistory` options to skip fetch during fresh optimistic flows; lint command currently blocked by interactive ESLint init prompt.
