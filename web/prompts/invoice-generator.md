# Invoice Generator – Claude Code Prompt

You are an expert frontend engineer.  
Build a **web-based invoice generator component** that will be integrated into an existing web project (do NOT scaffold a full app).  
Focus on clean, modular, production-ready code.

---

## 1. General Requirements

- Create an **Invoice Generator UI** closely matching the provided reference image.
- The component must be **self-contained**, reusable, and framework-agnostic.
- Assume it will be integrated into an existing web project.
- Client-side only (no backend).
- Responsive (desktop-first, mobile-friendly).
- Clean, modern UI.

---

## 2. Currency Handling

- **Default currency:** Philippine Peso (**PHP – ₱**)
- Provide a dropdown with common currencies only:
  - PHP (₱)
  - USD ($)
  - EUR (€)
  - GBP (£)
  - JPY (¥)
- Currency selection:
  - Changes symbol and formatting only
  - Does NOT auto-convert values
- Use proper number formatting (e.g. `₱1,234.56`).

---

## 3. Invoice Header Section

Inputs:
- Invoice Number (text)
- Purchase Order (text)
- Logo Upload
  - JPG, JPEG, PNG
  - Max 5MB
  - Show logo preview
- Your Company Details (textarea)
- Bill To (textarea)
- Invoice Date (date picker)
- Due Date (date picker)

---

## 4. Line Items Section

Table-style layout with:
- Item Description (text)
- Unit Cost (number)
- Quantity (number)
- Amount (auto-calculated)
- Remove item button
- “Add Item” button

### Line Item Rules

- `amount = unitCost × quantity`
- Values update instantly on change
- Prevent negative numbers
- Support unlimited items
- **If an item is blank, it must NOT be included**
  - Blank means:
    - Empty description OR
    - Unit cost is empty or 0 OR
    - Quantity is empty or 0
- Blank items:
  - Are ignored in subtotal and total calculations
  - Are NOT rendered in the final invoice
  - Are NOT included in the generated PDF

This is critical because the invoice will be **saved as a PDF**.

---

## 5. Summary & Calculations

Right-aligned summary panel:

- Subtotal (auto-calculated)
- Tax (%) input
- Discount (fixed amount)
- Shipping Fee (fixed amount)
- **Total**

Calculation logic:
subtotal = sum(nonBlankItem.amount)
taxAmount = subtotal * (tax / 100)
total = subtotal + taxAmount - discount + shipping


---

## 6. Notes & Bank Details

- Notes / Payment Terms (textarea)  
  Default text:
  > Payment is due within 15 days
- Bank Account Details (textarea)

---

## 7. PDF Generation & Download

Primary button:
- **Generate PDF Invoice**

On click:
1. Validate required invoice fields
2. Filter out all blank line items
3. Render a clean, print-ready invoice layout
4. Generate a **PDF invoice**
5. Automatically **download the PDF locally**

PDF requirements:
- Proper margins
- Clean typography
- Currency symbols applied consistently
- No input fields visible
- No empty rows or placeholders
- Filename format example:
Invoice-<invoice-number>.pdf


Use a client-side PDF solution such as:
- `html2pdf`
- `jsPDF`
- Or equivalent browser-safe approach

---

## 8. UX / UI Guidelines

- Match spacing and hierarchy from the reference image
- Light background for item section
- Green primary action button
- Rounded corners
- Clear hover and focus states
- Accessible labels and keyboard navigation

---

## 9. Code Quality Expectations

- Clean, readable variable names
- Clear separation of:
- State
- Calculations
- Rendering
- PDF generation
- Minimal dependencies
- Add short inline comments for important logic

---

## 10. Deliverables

Provide:
- Markup (HTML / JSX)
- Styles (CSS or utility-based)
- Core logic (JavaScript)
- PDF generation logic

Assume routing, bundling, and deployment are handled by the host project.
