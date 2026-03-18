# Report Builder — AI-Powered Custom Report Generator

A production-quality MVP that lets users upload any CSV dataset and generate reports using filters, calculations, and natural language (Gemini AI) — no code required.

---

## Architecture

```
report-builder/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── store.js          # Zustand state management
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── UploadZone.jsx
│   │       ├── ConfigPanel.jsx
│   │       ├── AIQueryBar.jsx
│   │       └── ResultPanel.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── data/
    └── sample_students.csv   # Sample dataset for testing
```

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, TailwindCSS, Zustand |
| Tables    | TanStack Table v8                   |
| Charts    | Recharts                            |
| HTTP      | Axios                               |
| Backend   | FastAPI, Python 3.11+               |
| Data      | Pandas                              |
| AI        | Google Gemini 1.5 Flash             |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API key → https://aistudio.google.com/app/apikey

---

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
export GEMINI_API_KEY="your-key-here"
# Windows: set GEMINI_API_KEY=your-key-here

# Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## API Reference

### POST /api/upload-csv
Upload a CSV file.

```bash
curl -X POST http://localhost:8000/api/upload-csv \
  -F "file=@data/sample_students.csv"
```

Response:
```json
{
  "columns": ["student_id", "name", "subject", "marks", "total_marks", "grade", "attendance_pct", "city"],
  "column_info": [{"name": "student_id", "dtype": "int64"}, ...],
  "row_count": 15
}
```

---

### GET /api/columns
Get columns of the loaded dataset.

```bash
curl http://localhost:8000/api/columns
```

---

### POST /api/generate-report
Generate a filtered, aggregated report.

```bash
curl -X POST http://localhost:8000/api/generate-report \
  -H "Content-Type: application/json" \
  -d '{
    "columns": ["name", "subject", "marks", "grade"],
    "filters": [
      {"field": "marks", "op": ">=", "value": 80}
    ],
    "calculations": [
      {"type": "avg", "field": "marks", "label": "Average Marks"},
      {"type": "count", "field": "student_id", "label": "Student Count"},
      {"type": "custom", "formula": "(marks / total_marks) * 100", "label": "Score Pct"}
    ]
  }'
```

Response:
```json
{
  "data": [{"name": "Alice", "subject": "Math", "marks": 88, "grade": "A"}, ...],
  "summary": {"Average Marks": 87.5, "Student Count": 8, "Score Pct": 87.5},
  "row_count": 8
}
```

---

### POST /api/ai-query
Natural language to report config via Gemini.

```bash
curl -X POST http://localhost:8000/api/ai-query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the average marks per city for students with attendance above 85%"}'
```

Response:
```json
{
  "config": {
    "columns": ["city", "marks"],
    "filters": [{"field": "attendance_pct", "op": ">", "value": "85"}],
    "calculations": [{"type": "avg", "field": "marks", "label": "Average Marks"}]
  }
}
```

---

## Features

### Manual Mode
1. Upload any CSV file
2. Toggle columns to include in the report
3. Add filters (field / operator / value)
4. Add calculations (avg, sum, count, min, max, custom formula)
5. Click "Generate Report"

### AI Mode
1. Type a natural language description of your report
2. Click "Generate with AI"
3. Gemini parses your request, fills in the config, and runs the report automatically

### Calculations
| Type   | Example                           |
|--------|-----------------------------------|
| avg    | Average of any numeric column      |
| sum    | Total of any numeric column        |
| count  | Row count                         |
| min    | Minimum value                     |
| max    | Maximum value                     |
| custom | `(marks / total_marks) * 100`     |

### Custom Formulas
- Safe arithmetic only: `+`, `-`, `*`, `/`, `(`, `)`
- Use actual column names from your dataset
- No `eval` — parsed via restricted AST
- Example: `(revenue - cost) / revenue * 100`

---

## Safety

- No `eval` for formulas — custom restricted executor
- AI JSON output is validated before use (column names, operators, calc types)
- Formula strings validated by regex before execution
- No hardcoded datasets — works with any CSV

---

## Usage Notes

- The app keeps one dataset in memory at a time. Upload a new CSV to replace it.
- The Gemini AI query requires GEMINI_API_KEY to be set.
- Column names are trimmed of whitespace on upload.
- Null/NaN values are handled gracefully (shown as `—` in the table).
