# Contributing to Best City Spots

Thank you for considering contributing to Best City Spots! This document provides guidelines and standards for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Git

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/AwaleSagar/bestcityspots.git
   cd bestcityspots
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Run linting and formatting:

   ```bash
   npm run lint
   npm run format
   ```

4. Test your changes thoroughly

5. Commit your changes with a descriptive message

6. Push to your branch and create a Pull Request

## Coding Standards

### TypeScript

#### General Guidelines

- **Always use TypeScript**: Never use plain JavaScript files for source code
- **Enable strict mode**: The project uses strict TypeScript configuration
- **Explicit types**: Prefer explicit type annotations for function parameters and return values
- **No `any` type**: Avoid using `any`. Use `unknown` if you need a dynamic type

```typescript
// ✅ Good
function getUserById(id: number): Promise<User | null> {
  // ...
}

// ❌ Bad
function getUserById(id: any): Promise<any> {
  // ...
}
```

#### Type Definitions

- Define interfaces for complex objects
- Use `type` for unions, intersections, and mapped types
- Export types that are used across multiple files

```typescript
// ✅ Good
export interface City {
  id: number;
  name: string;
  country: string;
}

export type CitySearchResult = City & {
  matchScore: number;
};

// ❌ Bad
export interface City {
  id: any;
  name: any;
  country: any;
}
```

#### Naming Conventions

- **Interfaces/Types**: PascalCase (e.g., `UserProfile`, `CityData`)
- **Variables/Functions**: camelCase (e.g., `getUserData`, `cityList`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RESULTS`, `API_ENDPOINT`)
- **Components**: PascalCase (e.g., `CityCard`, `SearchBar`)
- **Files**: kebab-case for utilities, PascalCase for components

### React/Next.js

#### Component Structure

```typescript
// ✅ Good component structure
import { useState, useEffect } from 'react';
import type { FC } from 'react';

interface CityCardProps {
  city: City;
  onSelect: (id: number) => void;
}

export const CityCard: FC<CityCardProps> = ({ city, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* component content */}
    </div>
  );
};
```

#### React Best Practices

- **Use functional components**: Prefer function components over class components
- **Hooks order**: useState, useEffect, useMemo, useCallback, custom hooks
- **Avoid inline functions in JSX**: Extract to variables or useCallback for performance
- **Accessibility**: Always include ARIA labels and semantic HTML
- **Key prop**: Always use stable, unique keys in lists

```typescript
// ✅ Good
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);

return <button onClick={handleClick}>Click me</button>;

// ❌ Bad
return <button onClick={() => {/* logic */}}>Click me</button>;
```

#### Effects and Side Effects

- **Don't call setState synchronously in effects** unless synchronizing with external systems
- **Include all dependencies**: Use ESLint's exhaustive-deps rule
- **Cleanup**: Always cleanup subscriptions, timers, and event listeners

```typescript
// ✅ Good
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchResults(results);
  }, 200);

  return () => clearTimeout(timer);
}, [results]);

// ❌ Bad
useEffect(() => {
  setMounted(true); // Avoid direct setState in effects
}, []);
```

#### Server Components vs Client Components

- Use Server Components by default (Next.js 13+ App Router)
- Mark with `"use client"` only when you need:
  - Browser APIs (localStorage, window, etc.)
  - Event handlers
  - State or Effects
  - Custom hooks

### CSS and Styling

#### Tailwind CSS

- **Utility-first**: Use Tailwind utilities for styling
- **Custom classes**: Define reusable custom classes in `globals.css`
- **Responsive design**: Use Tailwind's responsive modifiers (sm:, md:, lg:)
- **Dark mode**: Support dark mode using Tailwind's dark: modifier

```tsx
// ✅ Good
<div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
  {/* content */}
</div>

// ❌ Bad (inline styles)
<div style={{ display: 'flex', padding: '16px' }}>
  {/* content */}
</div>
```

#### CSS Custom Properties

- Define theme-related values in `:root` in `globals.css`
- Use semantic naming (e.g., `--color-primary`, `--spacing-lg`)

### Code Quality

#### Error Handling

- Always handle errors in async functions
- Provide user-friendly error messages
- Log errors to console in development

```typescript
// ✅ Good
async function fetchCities(query: string): Promise<City[]> {
  try {
    const response = await api.search(query);
    if (!response.ok) {
      throw new Error("Failed to fetch cities");
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return [];
  }
}
```

#### Performance

- **Memoization**: Use `useMemo` and `useCallback` for expensive computations
- **Code splitting**: Use dynamic imports for large components
- **Image optimization**: Use Next.js Image component
- **Debouncing**: Debounce search inputs and API calls

#### Security

- **Never expose secrets**: Use environment variables, never commit secrets
- **Input validation**: Validate and sanitize all user inputs
- **XSS prevention**: Escape user-generated content
- **SQL injection**: Use parameterized queries (Supabase handles this)

```typescript
// ✅ Good
const sanitized = userInput.replace(/[^a-zA-Z0-9\s-]/g, "");

// ❌ Bad
const query = `SELECT * FROM users WHERE name = '${userInput}'`;
```

### File Organization

```
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── cities/         # City-related pages
├── components/         # Reusable components
│   ├── ui/            # UI components (buttons, inputs, etc.)
│   └── features/      # Feature-specific components
├── lib/               # Utility functions and libraries
│   ├── supabase.ts    # Supabase client
│   └── cities.ts      # City-related utilities
├── types/             # TypeScript type definitions
└── styles/            # Global styles
```

## Commit Guidelines

### Commit Message Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

#### Examples

```
feat(search): add city search with debouncing

Implemented city search with 200ms debounce for better UX.
Added caching to reduce API calls.

Closes #123
```

```
fix(ui): correct button alignment on mobile

The search button was misaligned on screens smaller than 640px.
Applied flex utilities to fix the layout.
```

### Commit Best Practices

- Keep commits atomic and focused
- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Don't commit commented-out code
- Don't commit generated files or dependencies

## Pull Request Process

1. **Update documentation**: Update README.md if you've changed functionality
2. **Self-review**: Review your own code before requesting review
3. **Write a clear PR description**:
   - What changes were made
   - Why these changes were necessary
   - How to test the changes
4. **Link related issues**: Use "Closes #123" in the PR description
5. **Request review**: Tag relevant reviewers
6. **Address feedback**: Respond to all review comments
7. **Squash commits**: Clean up commit history before merging if needed

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows the style guidelines
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] All tests pass (if applicable)
- [ ] No console errors in browser
- [ ] Changes work on mobile and desktop
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines

## Questions?

If you have questions about contributing, feel free to:

- Open an issue for discussion
- Reach out to maintainers
- Check existing issues and PRs for similar discussions

Thank you for contributing to Best City Spots! 🌎
