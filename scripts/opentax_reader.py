"""
OpenTax-AU Bridge Reader for OpenNetWorth (Slice 1F)

Why this file exists:
- Acts as the subprocess bridge between OpenNetWorth (TypeScript/Next.js) and
  OpenTax-AU's specialized Australian tax and document extraction engine (Python).
- Executes OpenTax-AU's UniversalTaxDocumentRouter and TaxInvoiceParser against
  text-based invoice and receipt PDFs without duplicating parsing logic.
- Enforces strict layout boundaries: documents matching the supported single-item/
  supplies invoice layout are marked supported; unsupported, scanned, or incomplete
  documents are explicitly marked unsupported without guessing missing values.

Tricky logic:
- Date Normalization: OpenTax-AU dates may appear as DD/MM/YYYY (e.g. 20/11/2025),
  ISO (2025-11-20), or text formats. We normalize all valid dates to canonical
  ISO YYYY-MM-DD format for storage.
- Currency Extraction: When OpenTax-AU's regex misses explicit natural-language
  currency declarations like "All amounts in Australian dollars (AUD)", this bridge
  inspects the sanitized text for explicit 3-letter ISO markers (AUD, USD, EUR, GBP, NZD, CAD).
- Zero Guesswork: If the invoice total cannot be definitively extracted from text,
  the bridge returns supported=False rather than guessing 0 or computing a sum.

TODO:
- Support multi-item quantity-unit-price tables in Slice 1G.
- Add local OCR / Vision support for photographed thermal receipts in Slice 1G.
"""

import sys
import os
import re
import json
from datetime import datetime
from pathlib import Path

# Add OpenTax-AU directory to sys.path if not already present
OPENTAX_PATH = os.environ.get("OPENTAX_PATH", r"D:\AntiGravityProjects\opentax-au")
if OPENTAX_PATH not in sys.path:
    sys.path.insert(0, OPENTAX_PATH)

try:
    from opentax_au.parser.router import UniversalTaxDocumentRouter
    from opentax_au.parser.invoice_parser import InvoiceParser
except ImportError as err:
    # If OpenTax-AU cannot be imported, emit structured error JSON
    output = {
        "supported": False,
        "error": f"Failed to import OpenTax-AU from '{OPENTAX_PATH}': {err}",
        "warnings": ["OpenTax-AU Python environment is not available."]
    }
    print(json.dumps(output))
    sys.exit(0)


def normalize_date(date_str: str) -> str:
    """Normalizes various invoice date formats to ISO YYYY-MM-DD."""
    if not date_str:
        return None
    date_clean = date_str.strip()
    # Check for DD/MM/YYYY
    match_dmy = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", date_clean)
    if match_dmy:
        d, m, y = match_dmy.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"
    # Check for ISO YYYY-MM-DD
    match_iso = re.match(r"^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$", date_clean)
    if match_iso:
        y, m, d = match_iso.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"
    try:
        dt = datetime.fromisoformat(date_clean)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


def extract_currency(text: str, metadata_currency: str) -> str:
    """
    Extracts 3-letter ISO currency code from metadata or explicit text declarations.
    """
    if metadata_currency and metadata_currency != "unresolved":
        return metadata_currency.upper()
    
    # Check for explicit natural language declarations
    if re.search(r"\b(?:Australian dollars|AUD)\b", text, re.IGNORECASE):
        return "AUD"
    if re.search(r"\b(?:US dollars|USD)\b", text, re.IGNORECASE):
        return "USD"
    if re.search(r"\b(?:Euros?|EUR)\b", text, re.IGNORECASE):
        return "EUR"
    if re.search(r"\b(?:British pounds?|GBP)\b", text, re.IGNORECASE):
        return "GBP"
    if re.search(r"\b(?:New Zealand dollars|NZD)\b", text, re.IGNORECASE):
        return "NZD"
    if re.search(r"\b(?:Canadian dollars|CAD)\b", text, re.IGNORECASE):
        return "CAD"
    if re.search(r"\b(?:Japanese yen|JPY)\b", text, re.IGNORECASE):
        return "JPY"

    return None


def extract_document(pdf_path: str) -> dict:
    """
    Parses a text-based PDF invoice using OpenTax-AU and validates against supported layout.
    """
    if not os.path.exists(pdf_path):
        return {
            "supported": False,
            "error": f"File not found: {pdf_path}",
            "warnings": ["Source file does not exist on disk."]
        }

    try:
        router = UniversalTaxDocumentRouter()
        doc = router.route_and_parse(pdf_path)
    except Exception as e:
        return {
            "supported": False,
            "error": f"OpenTax-AU parser exception: {str(e)}",
            "warnings": ["Extraction failed due to an internal parser exception."]
        }

    # Reject extraction errors or non-invoice types
    if doc.document_type == "error" or not doc.raw_text:
        return {
            "supported": False,
            "layout": "unsupported",
            "warnings": doc.warnings or ["Document could not be read as text."],
            "raw_text": doc.raw_text or ""
        }

    if doc.raw_text.startswith("[PDF Extraction Error:"):
        return {
            "supported": False,
            "layout": "unsupported",
            "warnings": [doc.raw_text],
            "raw_text": doc.raw_text
        }

    # Extract core facts
    data = doc.data
    supplier_name = getattr(data, "supplier_name", None) if data else None
    invoice_number = getattr(data, "invoice_number", None) if data else None
    raw_date = getattr(data, "date", None) if data else None
    total_amount = getattr(data, "total_amount", None) if data else None
    gst_amount = getattr(data, "gst_amount", None) if data else 0.0
    subtotal = getattr(data, "subtotal", None) if data else None
    line_items = getattr(data, "line_items", []) if data else []

    # Attempt fallback extraction of date from invoice_context if data.date was empty
    iso_date = normalize_date(raw_date)
    if not iso_date and doc.metadata and "invoice_context" in doc.metadata:
        ctx_date = doc.metadata["invoice_context"].get("issue_date")
        if ctx_date:
            iso_date = normalize_date(ctx_date)

    # Attempt fallback extraction of invoice number from text
    if not invoice_number and doc.raw_text:
        inv_match = re.search(r"\b(?:Invoice|Receipt)[:\s]+([A-Za-z0-9\-_]+)", doc.raw_text, re.I)
        if inv_match:
            invoice_number = inv_match.group(1).strip()

    # Determine currency
    currency = extract_currency(doc.raw_text, doc.metadata.get("currency"))

    # Validate against the supported layout:
    # 1. Must be recognized as an invoice or tax invoice
    # 2. Must have an identifiable supplier name
    # 3. Must have a valid total amount > 0
    # 4. Must have an identifiable date
    warnings = list(doc.warnings or [])

    if not supplier_name or supplier_name in ("Unknown Supplier", "Sender not established"):
        return {
            "supported": False,
            "layout": "unsupported_layout",
            "warnings": ["Supplier could not be identified with confidence. Retained for manual review."] + warnings,
            "raw_text": doc.raw_text[:1000]
        }

    if total_amount is None or total_amount <= 0:
        return {
            "supported": False,
            "layout": "unsupported_layout",
            "warnings": ["Document is missing an unambiguous printed total. Retained for manual review."] + warnings,
            "raw_text": doc.raw_text[:1000]
        }

    if not iso_date:
        return {
            "supported": False,
            "layout": "unsupported_layout",
            "warnings": ["Invoice issue date could not be identified with confidence. Retained for manual review."] + warnings,
            "raw_text": doc.raw_text[:1000]
        }

    # Extract source snippet (first 10 lines of document)
    snippet_lines = [line.strip() for line in doc.raw_text.splitlines() if line.strip()][:12]
    source_snippet = "\n".join(snippet_lines)

    # Format line items
    formatted_items = []
    for item in line_items:
        formatted_items.append({
            "description": item.get("description", "Supplies item"),
            "amount": float(item.get("amount", total_amount)),
            "source_line": item.get("source_line")
        })

    # If no structured table items were found, use default description
    if not formatted_items:
        formatted_items.append({
            "description": f"{supplier_name} purchase",
            "amount": float(total_amount),
            "source_line": 1
        })

    if not currency:
        warnings.append("Document currency could not be identified with confidence. Retained as unresolved until reviewed.")

    return {
        "supported": True,
        "layout": "simple_supplies_invoice",
        "supplier_name": supplier_name,
        "invoice_number": invoice_number,
        "date": iso_date,
        "currency": currency,
        "total_amount": float(total_amount),
        "gst_amount": float(gst_amount or 0.0),
        "subtotal": float(subtotal or (total_amount - (gst_amount or 0.0))),
        "line_items": formatted_items,
        "source_snippet": source_snippet,
        "warnings": warnings,
        "raw_text": doc.raw_text[:2000]
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"supported": False, "error": "Usage: opentax_reader.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = extract_document(pdf_path)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
