# Brick

A daily Wordle-style puzzle game where users guess a famous Lego Set based on 3 distinct parts from its inventory.

## Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS
- **State Management:** React Context / Local State
- **Backend/Automation:** Python
- **Testing:** Vitest + React Testing Library (Unit), Playwright (E2E)
- **Hosting:** GitHub Pages (Static Site)

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.8+
- Rebrickable API Key (optional, but recommended)

### Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up Rebrickable API Key (optional):
```bash
export REBRICKABLE_API_KEY=your_api_key_here
```

### Development

Start the development server:
```bash
npm run dev
```

Run unit tests:
```bash
npm test
```

Run E2E tests:
```bash
npm run test:e2e
```

### Generating Daily Puzzle

Run the Python script to generate today's puzzle:
```bash
python scripts/daily_update.py
```

This will:
- Fetch a random popular Lego set from Rebrickable
- Select 5 unique parts using the uniqueness algorithm
- Download part images to `/public/data/images/{date}/`
- Create puzzle file at `/public/data/puzzles/{date}.json`

### Building for Production

```bash
npm run build
```

The output will be in the `dist/` directory, ready for static hosting.

## Project Structure

```
brick/
├── src/                 # React source code
│   ├── components/      # React components
│   ├── test/           # Test setup
│   └── types.ts        # TypeScript types
├── scripts/            # Python automation scripts
│   └── daily_update.py # Daily puzzle generator
├── public/
│   └── data/           # Generated puzzle data and images
├── e2e/                # Playwright E2E tests
└── .github/workflows/   # GitHub Actions CI/CD
```

## Code Style

See [AGENTS.md](./AGENTS.md) for the complete codebase constitution, including:
- Code style guidelines
- Anti-AI-slop rules
- Testing standards
- File organization

## Deployment

The project is configured to deploy to GitHub Pages automatically via GitHub Actions when pushing to the `main` branch.

### Pre-Deployment Checklist

1. **Update repository URL in `index.html`**: Replace `yourusername` in the Open Graph and Twitter meta tags with your actual GitHub username
2. **Create OG Image**: Add an `og-image.png` file (1200x630px) to `/public/` for social media sharing
3. **Update robots.txt**: Replace `yourusername` in the sitemap URL
4. **Enable GitHub Pages**: 
   - Go to repository Settings → Pages
   - Source: GitHub Actions
5. **Verify base path**: The base path in `vite.config.ts` should match your repository name (currently `/brick/`)

### Production Features

- ✅ SEO meta tags (Open Graph, Twitter Cards)
- ✅ PWA manifest for installability
- ✅ Web Share API for mobile sharing
- ✅ Error boundary for graceful error handling
- ✅ Accessibility improvements (ARIA labels, keyboard navigation)
- ✅ Mobile-first design with 44px minimum touch targets
- ✅ 404 page for GitHub Pages
- ✅ Automated deployment via GitHub Actions

## License

MIT

