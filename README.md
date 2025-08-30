# RSS Articles - Monorepo

En produktionsklar monorepo med Next.js frontend och FastAPI backend för att bearbeta RSS-flöden och generera LinkedIn-innehåll.

## Översikt

Systemet hämtar RSS-artiklar, extraherar fulltext, applicerar hårda filter, bedömer med LLM, och genererar två svenska utdata (LinkedIn-artikel + personligt LinkedIn-inlägg) som skrivs till Notion.

## Struktur

```
/
├── frontend/          # Next.js 14 frontend (TypeScript, Tailwind, shadcn/ui)
├── backend/           # FastAPI backend (Python 3.11+)
├── data/              # Runtime: config.yaml, uploads, exports
├── logs/              # Runtime: run.log
├── README.md
├── .gitignore
├── env.example
└── backend/env.example
```

## Snabbstart

### 1. Förutsättningar

- Python 3.11+
- Node.js 18+
- Git

### 2. Klona och installera

```bash
# Klona repository
git clone <repository-url>
cd rss-articles

# Installera backend-beroenden
cd backend
pip install -r requirements.txt

# Installera frontend-beroenden
cd ../frontend
npm install
```

### 3. Miljövariabler

```bash
# Skapa backend .env-fil
cp backend/env.example backend/.env
# Redigera backend/.env med dina API-nycklar

# Skapa frontend .env-fil
cp frontend/env.local.example frontend/.env.local
# Redigera frontend/.env.local om nödvändigt
```

### 4. Kör systemet

```bash
# Terminal 1: Starta backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Starta frontend
cd frontend
npm run dev
```

### 5. Öppna UI

Gå till http://localhost:3000

## Konfiguration

### 1. API-nycklar

Gå till `/secrets` i UI:n och sätt:
- **OpenAI API Key**: För LLM-klassificering och innehållsgenerering
- **Notion API Key**: För att skriva till Notion-databas

### 2. Feed-regler

Gå till `/feeds` och:
- Ladda upp Excel-fil med feed-regler, eller
- Redigera feeds manuellt i UI:n

Excel-kolumner:
- `feed_url`: RSS-feed URL
- `label`: Beskrivande namn
- `topic_default`: Standardämne (en av tre)
- `include_any`: Inkludera om någon matchar (kommaseparerat)
- `include_all`: Inkludera om alla matchar (kommaseparerat)
- `exclude_any`: Exkludera om någon matchar (kommaseparerat)
- `min_words`: Minsta antal ord
- `max_age_days`: Max ålder i dagar
- `language`: Språk (sv, en, eller tom)
- `source_weight`: Källvikt (0.0-2.0)
- `enabled`: Aktiverad (true/false)

### 3. Prompts

Gå till `/prompts` för att anpassa LLM-prompts för:
- Klassificering av artiklar
- Generering av LinkedIn-artiklar
- Generering av personliga inlägg

### 4. Inställningar

Gå till `/settings` för att konfigurera:
- OpenAI-modell
- Vikt-tröskel
- Standardvärden för nya feeds

## Användning

### 1. Kör pipeline

Gå till `/` (Körning) och:
- Välj "Dry run" för förhandsvisning
- Sätt begränsning på antal artiklar
- Välj specifika feeds (eller alla)
- Klicka "Kör nu"

### 2. Granska resultat

- Se sammanfattning: behållna, hoppade över, filtrerade
- Granska individuella artiklar med poäng och anledningar
- Expandera för att se genererat innehåll

### 3. Skriv till Notion

- Kör utan "Dry run" för att skriva till Notion
- Artiklar skapas som sidor med:
  - Properties: Titel, Ämne, Datum, Källa
  - Blocks: "Artikel (struktur)" och "Inlägg (personlig touch)"

## API Endpoints

### Backend (http://localhost:8000)

- `GET /api/config/` - Hämta konfiguration
- `PUT /api/config/` - Uppdatera konfiguration
- `GET /api/feeds/` - Hämta feed-regler
- `POST /api/feeds/upload` - Ladda upp Excel
- `GET /api/feeds/export` - Exportera Excel
- `POST /api/run/` - Kör pipeline
- `GET /api/logs/tail` - Hämta loggar
- `GET /api/secrets/meta` - Hämta nyckel-status
- `POST /api/secrets/set` - Sätt nyckel
- `POST /api/secrets/test` - Testa nyckel

## Felsökning

### Vanliga problem

1. **"OpenAI client not initialized"**
   - Kontrollera att OpenAI API-nyckel är satt i `/secrets`

2. **"Notion client not initialized"**
   - Kontrollera att Notion API-nyckel och Database ID är satta

3. **"Content too short"**
   - Artiklar med <120 ord hoppas över automatiskt
   - Justera `min_words` i feed-regler

4. **"Feed parsing issues"**
   - Kontrollera att RSS-URL:er är giltiga
   - Se loggar i `/logs` för detaljer

5. **"No active feeds found"**
   - Kontrollera att feeds är aktiverade i `/feeds`
   - Ladda upp feed-regler via Excel

### Loggar

- Backend-loggar: `/logs` i UI:n eller `logs/run.log`
- Innehåller drop-anledningar och skrivresultat
- Auto-uppdatering var 5:e sekund

### Notion-schema

Notion-databasen behöver följande properties:
- **Title** (Title)
- **Ämne** (Select: "SEO & AI visibility", "Webbanalys & AI", "Generativ AI")
- **Datum** (Date)
- **Källa** (URL)

## Utveckling

### Backend

```bash
cd backend
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

### Git

```bash
# Initial commit redan gjord
git status
git add .
git commit -m "Your changes"
```

## Säkerhet

- API-nycklar sparas i `backend/.env` (inte committade)
- Nycklar maskeras i UI:n (visar endast sista 4 tecken)
- CORS konfigurerat för localhost:3000
- Rate limiting på API-test endpoints

## Licens

MIT License
