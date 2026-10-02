# jobrador-f

Website for Student Job Map. It renders the map, filters, and pages. It never talks to the database. Every fact comes from the API in `jobrador-b`.

## Run

Start the API first, on port 4000. Then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:4000`. Copy `.env.example` if you need to point at another API.

## What is on screen

- Landing page with a Berlin area search
- Map with job listings, community leads, and nearby businesses
- Filters for distance, type, category, language, and salary
- Detail pages that keep those three labels separate
- A report form that posts a community lead
- Save and route lists stored in this browser only

The amber banner means the API is still serving sample data.

## Layout

```text
src/app        pages
src/features   map, report, route, and detail actions
src/components shared UI
src/lib/api    the only HTTP client
```

Map tiles come from OpenStreetMap. No map token is required for local development.
