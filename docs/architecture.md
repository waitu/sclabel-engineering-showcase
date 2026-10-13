# Architecture

## Private system: verified logical structure

The inspected codebase is a modular TypeScript application:

- A React/Vite client provides guest, authenticated-user, and administrator routes.
- An Axios client attaches bearer tokens and coalesces concurrent refresh attempts.
- A NestJS API uses global DTO validation, access/admin guards, and domain modules.
- PostgreSQL persists users, devices, OTPs, tokens, orders, labels, credits, pricing, notifications, settings, and audit history.
- Redis supports expiring import previews, list-backed jobs, and sliding-window rate limits.
- Worker and scheduler services perform bounded background processing.
- Integration modules isolate provider pagination, retry, timeout, and normalization logic.
- Docker Compose builds the API, scheduled-report process, static web server, PostgreSQL, and Redis; Nginx routes SPA navigation and API traffic.

## Sanitized component view

```mermaid
flowchart TB
  subgraph Browser
    ROUTER[Route guards]
    QUERY[Query cache]
    IMPORT[Import preview UI]
  end

  subgraph API
    AUTH[Authentication]
    DOMAIN[Order workflows]
    LEDGER[Credit ledger]
    VALIDATION[DTO validation]
  end

  subgraph Async
    PREVIEW[Expiring previews]
    QUEUE[Job queue]
    SCHEDULER[Scheduled runs]
  end

  ROUTER --> AUTH
  QUERY --> DOMAIN
  IMPORT --> VALIDATION
  VALIDATION --> DOMAIN
  DOMAIN --> LEDGER
  AUTH --> DB[(PostgreSQL)]
  DOMAIN --> DB
  LEDGER --> DB
  DOMAIN --> PREVIEW
  PREVIEW --> CACHE[(Redis)]
  QUEUE --> CACHE
  SCHEDULER --> DOMAIN
```

## Boundaries in this public repository

The public examples do not reproduce controllers, database schemas, provider adapters, Docker files, UI components, brand assets, or operational configuration from the private repository. Each example is an independent implementation of a general engineering pattern.
