---
name: react-typescript-best-practices
description: "Best practices for React, TypeScript, state management, hooks, and clean component architecture."
---

# React & TypeScript Best Practices Skill

## Architecture & Code Quality Guidelines

### 1. Component Structure & Type Safety
- **Strict Typing:** Always use explicit TypeScript interfaces/types for component props and state. Avoid `any` at all costs.
- **Functional Components:** Prefer standard React functional components (`FC` or explicit prop typing).
- **Separation of Concerns:** Keep presentation components decoupled from business logic and custom hooks.

### 2. State Management Rules
- Use local component state (`useState`) for UI-only state.
- Keep transient draft state local to components; do not push incomplete draft objects directly into global array states.
- For complex state logic, use `useReducer` or context providers.

### 3. Hooks Guidelines
- Always follow the Rules of Hooks (never call hooks conditionally).
- Ensure all dependencies are declared accurately in `useEffect`, `useCallback`, and `useMemo` dependency arrays.
- Create custom hooks for reusable logic (e.g. data fetching, form handling, authentication).
