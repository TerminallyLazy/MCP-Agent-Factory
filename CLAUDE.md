# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)
- `cd frontend && npm run dev`: Run frontend development server with turbopack
- `cd frontend && npm run build`: Build frontend for production
- `cd frontend && npm run lint`: Run ESLint on frontend code
- `cd frontend && npm run typecheck`: Run `tsc --noEmit` for type checking

### Python
- `python example.py --mode general`: Run general assistant example
- `python example.py --mode tools`: Run tool listing example
- Install dependencies: `pip install -r requirements.txt`

## Code Guidelines

### TypeScript (Frontend)
- Use TypeScript for type safety, strict mode enabled
- Follow Next.js file-based routing conventions
- Import paths use `@/*` alias for `./src/*`
- Use TailwindCSS for styling
- Component naming: PascalCase (e.g., `HeaderWrapper.tsx`)

### Python (Backend)
- Use async/await pattern for asynchronous code
- Include docstrings for all functions and classes
- Use proper exception handling with specific catches
- Follow error propagation pattern with cleanup in finally blocks
- Prefer type annotations via typing module

### Logging
- Use the logging module for Python with appropriate levels
- Log initialization, errors, and cleanup operations