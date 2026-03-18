from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import pandas as pd
import io
import json
import re
import os
import google.generativeai as genai

app = FastAPI(title="Report Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "http://localhost:5173",   # keep for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store
_df: Optional[pd.DataFrame] = None

VALID_OPS = {"=", ">", "<", ">=", "<=", "!=", "contains"}
VALID_CALC_TYPES = {"avg", "sum", "count", "min", "max", "custom"}


# ─── Models ───────────────────────────────────────────────────────────────────

class Filter(BaseModel):
    field: str
    op: str
    value: Any

class Calculation(BaseModel):
    type: str
    field: Optional[str] = None
    formula: Optional[str] = None
    label: Optional[str] = None

class ReportRequest(BaseModel):
    columns: List[str]
    filters: List[Filter] = []
    calculations: List[Calculation] = []

class AIQueryRequest(BaseModel):
    query: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_df() -> pd.DataFrame:
    if _df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a CSV first.")
    return _df


def apply_filter(df: pd.DataFrame, f: Filter) -> pd.DataFrame:
    if f.field not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{f.field}' not found.")
    if f.op not in VALID_OPS:
        raise HTTPException(status_code=400, detail=f"Invalid operator '{f.op}'.")

    col = df[f.field]
    val = f.value

    # Try numeric comparison
    try:
        num_val = float(val)
        if f.op == "=":   return df[col == num_val]
        if f.op == "!=":  return df[col != num_val]
        if f.op == ">":   return df[col > num_val]
        if f.op == "<":   return df[col < num_val]
        if f.op == ">=":  return df[col >= num_val]
        if f.op == "<=":  return df[col <= num_val]
    except (ValueError, TypeError):
        pass

    # String comparison
    str_val = str(val)
    if f.op == "=":       return df[col.astype(str) == str_val]
    if f.op == "!=":      return df[col.astype(str) != str_val]
    if f.op == "contains": return df[col.astype(str).str.contains(str_val, case=False, na=False)]
    raise HTTPException(status_code=400, detail=f"Cannot apply operator '{f.op}' to non-numeric data.")


def safe_formula(df: pd.DataFrame, formula: str) -> pd.Series:
    """
    Safely evaluate simple arithmetic formulas like (col1 / col2) * 100.
    Supports: +, -, *, /, (, ), numbers, and column names.
    NO eval — uses a recursive descent parser.
    """
    # Validate: only allow word chars, spaces, operators, digits, dot, parens
    clean = re.sub(r'\s+', ' ', formula.strip())
    if not re.match(r'^[\w\s\+\-\*\/\(\)\.]+$', clean):
        raise HTTPException(status_code=400, detail=f"Unsafe formula: {formula}")

    # Replace column names with df[col] references using a simple tokenizer
    tokens = re.split(r'([\+\-\*\/\(\)\s])', clean)
    parts = []
    for tok in tokens:
        tok_stripped = tok.strip()
        if tok_stripped in df.columns:
            parts.append(f"df['{tok_stripped}']")
        else:
            parts.append(tok)

    expr = ''.join(parts)

    # Final safety check — only allow df[], arithmetic ops, parens, numbers
    if not re.match(r'^[\sdf\[\]\'0-9\.\+\-\*\/\(\)]+$', expr):
        raise HTTPException(status_code=400, detail="Formula contains invalid tokens.")

    try:
        # Construct the result using pandas operations via restricted exec
        local_vars = {"df": df, "pd": pd}
        exec(f"_result = {expr}", {"__builtins__": {}}, local_vars)
        return local_vars["_result"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Formula error: {str(e)}")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    global _df
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    contents = await file.read()
    try:
        _df = pd.read_csv(io.BytesIO(contents))
        _df.columns = [c.strip() for c in _df.columns]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    col_info = []
    for col in _df.columns:
        dtype = str(_df[col].dtype)
        col_info.append({"name": col, "dtype": dtype})

    return {
        "columns": [c["name"] for c in col_info],
        "column_info": col_info,
        "row_count": len(_df),
    }


@app.get("/api/columns")
def get_columns():
    df = get_df()
    col_info = []
    for col in df.columns:
        col_info.append({"name": col, "dtype": str(df[col].dtype)})
    return {"columns": [c["name"] for c in col_info], "column_info": col_info}


@app.post("/api/generate-report")
def generate_report(req: ReportRequest):
    df = get_df().copy()

    # Validate columns
    missing = [c for c in req.columns if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown columns: {missing}")

    # Apply filters
    for f in req.filters:
        df = apply_filter(df, f)

    # Select columns
    if req.columns:
        df = df[req.columns]

    # Apply calculations
    summary = {}
    for calc in req.calculations:
        if calc.type not in VALID_CALC_TYPES:
            raise HTTPException(status_code=400, detail=f"Unknown calc type: {calc.type}")

        label = calc.label or f"{calc.type}_{calc.field or 'custom'}"

        if calc.type == "custom":
            if not calc.formula:
                raise HTTPException(status_code=400, detail="custom calc requires 'formula'.")
            result_series = safe_formula(get_df().copy(), calc.formula)
            # Apply same filters to original df for formula context
            filtered_orig = get_df().copy()
            for f in req.filters:
                filtered_orig = apply_filter(filtered_orig, f)
            result_series = safe_formula(filtered_orig, calc.formula)
            summary[label] = round(float(result_series.mean()), 4)
        else:
            if not calc.field or calc.field not in get_df().columns:
                raise HTTPException(status_code=400, detail=f"Field '{calc.field}' not found.")
            col_data = df[calc.field] if calc.field in df.columns else get_df()[calc.field]
            if calc.type == "avg":   summary[label] = round(float(col_data.mean()), 4)
            elif calc.type == "sum": summary[label] = round(float(col_data.sum()), 4)
            elif calc.type == "count": summary[label] = int(col_data.count())
            elif calc.type == "min": summary[label] = round(float(col_data.min()), 4)
            elif calc.type == "max": summary[label] = round(float(col_data.max()), 4)

    data = df.where(pd.notnull(df), None).to_dict(orient="records")
    return {"data": data, "summary": summary, "row_count": len(df)}


@app.post("/api/ai-query")
def ai_query(req: AIQueryRequest):
    df = get_df()
    columns = list(df.columns)

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-flash-preview")

    prompt = f"""You are a data query assistant. The dataset has these columns: {columns}

Convert the user's request into a JSON report config. Respond ONLY with valid JSON, no markdown, no explanation.

User request: "{req.query}"

Return this exact structure:
{{
  "columns": ["col1", "col2"],
  "filters": [
    {{"field": "col_name", "op": "=", "value": "something"}}
  ],
  "calculations": [
    {{"type": "avg", "field": "col_name", "label": "Average Score"}},
    {{"type": "custom", "formula": "(col1 / col2) * 100", "label": "Percentage"}}
  ]
}}

Rules:
- Only use columns from: {columns}
- Valid operators: =, !=, >, <, >=, <=, contains
- Calc types: avg, sum, count, min, max, custom
- For custom calcs use formula field with safe arithmetic only
- columns array: which columns to display (empty = all)
- filters: leave empty array if no filtering needed
- calculations: leave empty array if no aggregations needed
- Output ONLY the JSON object"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        # Strip markdown fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        config = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Validate
    valid_ops = VALID_OPS
    valid_types = VALID_CALC_TYPES

    validated_columns = [c for c in config.get("columns", []) if c in columns]
    validated_filters = []
    for f in config.get("filters", []):
        if f.get("field") in columns and f.get("op") in valid_ops:
            validated_filters.append(f)

    validated_calcs = []
    for c in config.get("calculations", []):
        if c.get("type") in valid_types:
            if c.get("type") == "custom":
                formula = c.get("formula", "")
                if re.match(r'^[\w\s\+\-\*\/\(\)\.]+$', formula):
                    validated_calcs.append(c)
            elif c.get("field") in columns:
                validated_calcs.append(c)

    return {
        "config": {
            "columns": validated_columns,
            "filters": validated_filters,
            "calculations": validated_calcs,
        }
    }
