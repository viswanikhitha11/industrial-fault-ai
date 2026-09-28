# Industrial Fault AI

A full-stack app for AI-assisted visual triage of industrial equipment faults:
upload a photo + describe symptoms, and a multimodal Gemini model + a
deterministic safety-rule layer return a structured triage result (possible
fault, severity, confidence, causes, first-level actions, and whether a
technician is required).

```
fault-ai-app/
├── frontend/   React + Vite app (your existing UI, untouched)
└── backend/    Node.js + Express + MongoDB + Gemini API
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- `MONGO_URI` — a local MongoDB (`mongodb://127.0.0.1:27017/industrial-fault-ai`)
  or a free MongoDB Atlas cluster connection string.
- `GEMINI_API_KEY` — a free key from https://aistudio.google.com/app/apikey.
  Without this, the API still runs but returns a safe fallback result ("AI
  analysis failed — treat this case as requiring manual inspection") instead
  of a real triage.
- `GEMINI_MODEL` — defaults to `gemini-2.0-flash` (vision-capable, on the free
  tier). Change it in `.env` if you want a different Gemini model.
- `CLIENT_ORIGIN` — must match wherever the frontend actually runs
  (default `http://localhost:5173`).

Start it:

```bash
npm run dev      # with nodemon, auto-restarts on changes
# or
npm start
```

You should see:
```
MongoDB connected: mongodb://127.0.0.1:27017/industrial-fault-ai
Industrial Fault AI backend running on http://localhost:5000
```

Quick check: open `http://localhost:5000/api/health` — it should return
`{"status":"ok", ...}`.

## 2. Frontend setup

```bash
cd frontend
npm install
```

`frontend/.env` already contains:
```
VITE_API_URL=http://localhost:5000
```
Change this if your backend runs somewhere else.

Start it:

```bash
npm run dev
```

Open `http://localhost:5173`.

## 3. Using it

1. Go to **Analyze Fault**, pick an equipment type, upload a photo, describe
   the symptoms, and submit.
2. The backend saves the image, sends it + your description to Gemini with a
   structured-JSON prompt, runs the result through the safety-rule engine
   (which can only escalate severity/technician-required, never downgrade
   it), saves the case to MongoDB, and returns it.
3. You're redirected to the **Result** page with the full triage breakdown.
4. **History** lists every past case; deleting removes it from MongoDB.

## API reference (what the frontend calls)

| Method | Endpoint                          | Purpose                                   |
|--------|------------------------------------|--------------------------------------------|
| POST   | `/api/faults/analyze`             | multipart form: `equipmentType`, `equipmentId`, `description`, `image` file → creates + returns a fault case |
| GET    | `/api/faults`                     | list all fault cases, newest first        |
| GET    | `/api/faults/:id`                 | one fault case                            |
| DELETE | `/api/faults/:id`                 | delete a fault case                       |
| GET    | `/api/faults/trends/:equipmentId` | count of cases for that equipment in the last 30 days + `repeatedIssue` flag |

Response shape (`aiResult`) matches exactly what `Result.jsx` and
`History.jsx` already expect: `possibleFault`, `severity`, `confidence`,
`visualObservations`, `possibleCauses`, `troubleshooting`,
`technicianRequired`, `safetyWarning`, `additionalInformationNeeded`.

## Notes / next steps

- **Images** are stored on local disk under `backend/uploads/` and served at
  `/uploads/<filename>`. Swap `backend/middleware/upload.js` for
  Cloudinary/S3 when you deploy — nothing else needs to change.
- **Safety rule engine** (`backend/services/safetyRules.js`) is intentionally
  separate from the LLM call — it hard-codes escalation rules (e.g. any
  mention of fire/smoke/sparking forces `CRITICAL` + technician required)
  so a bad AI response can't under-warn about a dangerous situation.
- **Auth** isn't implemented yet (`userId` defaults to `"anonymous"`). Add
  JWT auth later and pass `userId` through from the logged-in user.
- **Not implemented on purpose for the MVP**: image-quality pre-check as a
  separate step, and analytics beyond the simple 30-day repeat-issue check.
  Both slot into `aiService.js` / `faultController.js` respectively.
