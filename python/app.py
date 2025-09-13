'''
docker-compose build
docker-compose up -d
docker compose down
'''
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

# =============================================================================
# Enable CORS
# =============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Webhook URL
# =============================================================================
WEBHOOK_URL = "https://shubamsarawagi2.app.n8n.cloud/webhook/c5e46359-f84e-4f92-a9c4-ecc1b89fdba1"

def call_webhook(prompt: str) -> dict:
    try:
        response = requests.post(WEBHOOK_URL, json={"prompt": prompt}, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# =============================================================================
# Request/Response Models
# =============================================================================
class TransactionRequest(BaseModel):
    transaction_message: str

class TransactionResponse(BaseModel):
    output: str
    is_expense: bool = False
    expense_details: dict = None

# =============================================================================
# Helper: Format JSON into HTML
# =============================================================================
def format_transaction(data: dict) -> str:
    if "error" in data:
        return f"<b>Error:</b> {data['error']}"

    lenders = data.get("Lenders", [])
    borrowers = data.get("Borrowers", [])
    label = data.get("label", "N/A")

    output_lines = []

    # Format lenders
    for i, lender in enumerate(lenders, start=1):
        output_lines.append(f"<b>Lender {i}:</b><br>")
        output_lines.append(f"Name: {lender.get('name', 'Unknown')}<br>")
        output_lines.append(f"Amount Lent: {lender.get('amountLent', 0):.2f}<br><br>")

    # Format borrowers
    for i, borrower in enumerate(borrowers, start=1):
        output_lines.append(f"<b>Borrower {i}:</b><br>")
        output_lines.append(f"Name: {borrower.get('name', 'Unknown')}<br>")
        output_lines.append(f"Amount Borrowed: {borrower.get('amountBorrowed', 0):.2f}<br><br>")

    # Add single transaction label at the end
    output_lines.append(f"<b>Transaction Label:</b> {label}<br>")

    return "".join(output_lines).strip()

# =============================================================================
# Helper: Extract Expense Details
# =============================================================================
def extract_expense_details(data: dict) -> dict:
    lenders = data.get("Lenders", [])
    borrowers = data.get("Borrowers", [])
    label = data.get("label")

    total_amount = sum(lender.get("amountLent", 0) for lender in lenders)
    payer = lenders[0].get("name") if lenders else None
    participants = [b.get("name") for b in borrowers if b.get("name")]

    # Custom splits dictionary
    custom_splits = {b["name"]: b["amountBorrowed"] for b in borrowers if b.get("name")}

    return {
        "amount": total_amount,
        "description": f"Expense with {len(participants)} participants",
        "payer": payer,
        "participants": participants,
        "split_type": "custom" if custom_splits else "equal",
        "custom_splits": custom_splits if custom_splits else None,
        "label": label
    }

# =============================================================================
# API Endpoint
# =============================================================================
@app.post("/process", response_model=TransactionResponse)
def process_transaction(req: TransactionRequest):
    prompt = f"""
    Extract transaction details from: "{req.transaction_message}"

    Return ONLY JSON:
    {{
      "label": "string",
      "Lenders": [{{ "name": "string", "amountLent": number }}],
      "Borrowers": [{{ "name": "string", "amountBorrowed": number }}]
    }}
    """
    raw_data = call_webhook(prompt)
    formatted_output = format_transaction(raw_data)

    # Determine if it's an expense
    is_expense = bool(raw_data.get("Lenders") or raw_data.get("Borrowers"))

    expense_details = None
    if is_expense and not raw_data.get("error"):
        expense_details = extract_expense_details(raw_data)

    return TransactionResponse(
        output=formatted_output,
        is_expense=is_expense,
        expense_details=expense_details
    )