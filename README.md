# AI Corporate Gifting

React + Vite frontend with a local Node API that calls the OpenAI Responses API for structured gift recommendations.

Generated results render as 20 image-first product cards. Each card has a short two-line introduction and a WhatsApp button that opens `https://wa.me/919871621921`.

The API now reads product JSON files from `data/`, shortlists relevant catalog products for the customer brief, and asks OpenAI to choose from those uploaded products only. Product images are resolved through each WordPress product's featured media reference when available.

The quick search chips are tuned to common HR gifting needs in India and mapped to high-coverage catalog areas: employee welcome kits, Diwali gift sets, eco-friendly logo gifts, branded tech gadgets, and office essentials.

## Setup

1. Copy `.env.example` to `.env`.
2. Add your OpenAI API key:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=8787
API_ORIGIN=http://127.0.0.1:8787
```

3. Start the API server:

```bash
npm run api
```

4. In a second terminal, start the React app:

```bash
npm run dev
```

The frontend sends requests to `/api/gift-recommendations`, and Vite proxies them to `http://127.0.0.1:8787`.

Useful checks:

```bash
http://127.0.0.1:8787/api/health
http://127.0.0.1:8787/api/catalog-sample
http://127.0.0.1:8787/api/product-showcase
http://127.0.0.1:8787/api/product-image-debug/10338
```
