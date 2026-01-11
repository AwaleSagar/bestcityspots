# Code Style Quick Reference

A quick reference guide for developers working on Best City Spots.

## TypeScript

### ✅ Do

```typescript
// Explicit types for function signatures
function getUserById(id: number): Promise<User | null> {
  // ...
}

// Use interfaces for object shapes
interface City {
  id: number;
  name: string;
  country: string;
}

// Prefer const for immutable values
const MAX_RESULTS = 50;
```

### ❌ Don't

```typescript
// Don't use 'any'
function getData(id: any): Promise<any> {
  // ...
}

// Don't use var
var count = 0;

// Don't omit return types
function getUser(id: number) {
  // ...
}
```

## React Components

### ✅ Do

```typescript
// Functional components with typed props
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### ❌ Don't

```typescript
// Don't use inline functions in JSX (performance)
<button onClick={() => doSomething()}>Click</button>

// Don't call setState directly in useEffect
useEffect(() => {
  setMounted(true); // Bad
}, []);

// Don't forget dependencies
useEffect(() => {
  doSomething(value);
}, []); // Missing 'value' in dependencies
```

## Naming Conventions

| Type                | Convention       | Example                           |
| ------------------- | ---------------- | --------------------------------- |
| Components          | PascalCase       | `CityCard`, `SearchBar`           |
| Functions/Variables | camelCase        | `getUserData`, `isLoading`        |
| Constants           | UPPER_SNAKE_CASE | `MAX_RESULTS`, `API_URL`          |
| Interfaces/Types    | PascalCase       | `UserProfile`, `CityData`         |
| Files (utilities)   | kebab-case       | `api-client.ts`, `format-date.ts` |
| Files (components)  | PascalCase       | `CityCard.tsx`, `Header.tsx`      |

## CSS/Tailwind

### ✅ Do

```tsx
// Use Tailwind utilities
<div className="flex items-center gap-4 rounded-lg bg-white/5 p-4">
  {/* content */}
</div>

// Group related utilities
<div className="
  flex items-center gap-4
  rounded-lg bg-white/5 p-4
  hover:bg-white/10 transition-colors
">
  {/* content */}
</div>
```

### ❌ Don't

```tsx
// Don't use inline styles
<div style={{ display: "flex", padding: "16px" }}>{/* content */}</div>
```

## Error Handling

### ✅ Do

```typescript
// Always handle errors in async functions
async function fetchData() {
  try {
    const response = await api.get("/data");
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}
```

### ❌ Don't

```typescript
// Don't ignore errors
async function fetchData() {
  const response = await api.get("/data"); // What if this fails?
  return response.data;
}
```

## Imports

### ✅ Do

```typescript
// Group imports logically
import { useState, useEffect } from "react";
import type { FC } from "react";

import { City } from "@/types";
import { searchCities } from "@/lib/cities";

import { Button } from "@/components/Button";
```

### ❌ Don't

```typescript
// Don't mix import styles
import { Button } from "@/components/Button";
import type { FC } from "react";
import { searchCities } from "@/lib/cities";
import { useState, useEffect } from "react";
```

## Commit Messages

### Format

```
<type>(<scope>): <subject>
```

### Examples

```
feat(search): add city search with debouncing
fix(ui): correct button alignment on mobile
docs(readme): update installation instructions
refactor(api): simplify error handling
style(format): apply prettier formatting
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `perf` - Performance
- `test` - Tests
- `chore` - Maintenance

## Quick Commands

```bash
# Development
npm run dev              # Start dev server

# Code Quality
npm run lint             # Check for issues
npm run lint:fix         # Fix auto-fixable issues
npm run format           # Format all files
npm run format:check     # Check formatting
npm run type-check       # Check TypeScript types

# Production
npm run build            # Build for production
npm run start            # Start production server
```

## Accessibility

### ✅ Do

```tsx
// Always include ARIA labels
<button aria-label="Close menu">
  <X />
</button>

// Use semantic HTML
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Ensure keyboard navigation
<input onKeyDown={handleKeyDown} />
```

### ❌ Don't

```tsx
// Don't use divs for interactive elements
<div onClick={handleClick}>Click me</div>

// Don't forget alt text
<img src="city.jpg" />
```

## Security

### ✅ Do

```typescript
// Sanitize user input
const sanitized = userInput.replace(/[^a-zA-Z0-9\s-]/g, "");

// Use environment variables for secrets
const apiKey = process.env.API_KEY;

// Validate input length
if (query.length <= 100) {
  setSearchQuery(query);
}
```

### ❌ Don't

```typescript
// Don't commit secrets
const apiKey = "sk-1234567890abcdef"; // Bad!

// Don't trust user input
const html = `<div>${userInput}</div>`; // XSS risk

// Don't use string concatenation for queries
const query = `SELECT * FROM users WHERE name = '${name}'`; // SQL injection
```

## Performance

### ✅ Do

```typescript
// Memoize expensive computations
const filtered = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);

// Debounce frequent operations
useEffect(() => {
  const timer = setTimeout(() => {
    search(query);
  }, 300);
  return () => clearTimeout(timer);
}, [query]);

// Use Next.js Image component
import Image from 'next/image';
<Image src="/city.jpg" alt="City" width={400} height={300} />
```

### ❌ Don't

```typescript
// Don't filter in render
return data.filter(item => item.active).map(...); // Bad in render

// Don't create new functions in render
<button onClick={() => handleClick(id)}>Click</button>

// Don't use img tag for images
<img src="/city.jpg" alt="City" />
```

## File Organization

```
src/
├── app/                 # Next.js pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── cities/         # City pages
├── components/         # Reusable components
│   ├── ui/            # UI primitives
│   └── features/      # Feature components
├── lib/               # Utilities
│   ├── supabase.ts    # DB client
│   └── cities.ts      # City utils
├── types/             # Type definitions
└── styles/            # Global styles
```

## Need More Help?

- 📖 Read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines
- 🐛 Open an issue for bugs
- 💬 Start a discussion for questions
- 📧 Contact maintainers

---

**Remember**: Write code for humans first, machines second. Clarity > Cleverness.
