# DevManus Documentation Generator - Client

Frontend application for the API Documentation Generator built with Next.js 16, React 19, and TypeScript.

![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss)

---

## ✨ Features

- Modern Next.js 16 App Router architecture
- Real-time API testing with response preview
- Request history tracking
- Environment variable support
- Dark/Light theme
- Keyboard shortcuts
- Responsive design

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.4 |
| UI Library | React 19.2.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State Management | TanStack React Query 5 |
| Icons | Lucide React |
| Validation | Zod |
| Markdown | React Markdown + GFM |
| Code Highlighting | React Syntax Highlighter |

---

## 📦 Dependencies

### Production Dependencies

```json
{
  "@google/generative-ai": "^0.24.1",
  "@tanstack/react-query": "^5.90.19",
  "clsx": "^2.1.1",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.562.0",
  "next": "16.1.4",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "react-hot-toast": "^2.6.0",
  "react-markdown": "^10.1.0",
  "react-syntax-highlighter": "^16.1.0",
  "remark-gfm": "^4.0.1",
  "tailwind-merge": "^3.4.0",
  "zod": "^3.24.1"
}
```

### Development Dependencies

```json
{
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "16.1.4",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running server instance

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

---

## 🐳 Docker Setup

### Using Docker

```bash
# Build the image
docker build -t devmanus-docs-client .

# Run the container
docker run -p 3000:3000 devmanus-docs-client
```

### Docker Compose

From the root directory, use the main docker-compose.yml:

```bash
docker-compose up -d client
```

### Dockerfile

```dockerfile
# Use Node.js Alpine image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
```

---

## 📁 Project Structure

```
client/
├── app/
│   ├── docs/[id]/          # Main API client page
│   ├── dashboard/          # Collections dashboard
│   ├── login/              # Authentication pages
│   ├── register/
│   ├── changelog/
│   ├── import/
│   └── globals.css         # Global styles
├── components/             # Reusable UI components
│   ├── Skeleton.tsx
│   ├── ErrorBoundary.tsx
│   ├── SearchBar.tsx
│   ├── KeyboardShortcutsModal.tsx
│   ├── Provider.tsx
│   └── Modal.tsx
├── hooks/                  # Custom React hooks
│   ├── useEndpoints.ts
│   ├── useRequestExecutor.ts
│   ├── useResizable.ts
│   ├── useKeyboardShortcuts.ts
│   └── index.ts
├── types/                  # TypeScript definitions
│   └── index.ts
├── context/                # React context
│   └── ThemeContext.tsx
└── utils/                  # Utility functions
    └── api.ts
```

---

## 🧪 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🔑 API Configuration

The client communicates with the server at the URL specified in `NEXT_PUBLIC_API_URL`. Ensure the server is running before starting the client.

Default server URL: `http://localhost:4001/api`

---

## 📝 License

See the [main README](../README.md) for license information.
