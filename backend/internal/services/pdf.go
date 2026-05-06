package services

import (
	"bytes"
	"fmt"

	"github.com/billetra/backend/internal/models"
	"github.com/jung-kurt/gofpdf/v2"
)

type PDFService struct{}

func NewPDFService() *PDFService {
	return &PDFService{}
}

func (s *PDFService) GenerateBillPDF(bill *models.Bill, business *models.Business) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pageW, _ := pdf.GetPageSize()
	margins := 15.0
	contentW := pageW - 2*margins
	pdf.SetMargins(margins, margins, margins)
	pdf.SetAutoPageBreak(true, 15)

	// ── Header: Business Info ──────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 18)
	pdf.SetTextColor(30, 30, 30)
	pdf.CellFormat(contentW, 10, business.Name, "", 1, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(80, 80, 80)
	if business.Address != "" {
		pdf.CellFormat(contentW, 5, business.Address, "", 1, "L", false, 0, "")
	}
	addrLine := ""
	if business.City != "" {
		addrLine += business.City
	}
	if business.State != "" {
		if addrLine != "" {
			addrLine += ", "
		}
		addrLine += business.State
	}
	if business.Pincode != "" {
		addrLine += " - " + business.Pincode
	}
	if addrLine != "" {
		pdf.CellFormat(contentW, 5, addrLine, "", 1, "L", false, 0, "")
	}
	if business.Phone != "" {
		pdf.CellFormat(contentW, 5, "Phone: "+business.Phone, "", 1, "L", false, 0, "")
	}
	if business.GSTIN != "" {
		pdf.CellFormat(contentW, 5, "GSTIN: "+business.GSTIN, "", 1, "L", false, 0, "")
	}

	pdf.Ln(3)
	// Horizontal rule
	pdf.SetDrawColor(180, 180, 180)
	pdf.Line(margins, pdf.GetY(), pageW-margins, pdf.GetY())
	pdf.Ln(4)

	// ── Invoice details ────────────────────────────────────────────────────
	col1W := contentW * 0.5
	col2W := contentW - col1W

	yBefore := pdf.GetY()

	// Left: customer
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(30, 30, 30)
	pdf.CellFormat(col1W, 6, "BILL TO", "", 1, "L", false, 0, "")
	if bill.Customer != nil {
		pdf.SetFont("Helvetica", "B", 10)
		pdf.CellFormat(col1W, 6, bill.Customer.Name, "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(80, 80, 80)
		if bill.Customer.Phone != "" {
			pdf.CellFormat(col1W, 5, "Ph: "+bill.Customer.Phone, "", 1, "L", false, 0, "")
		}
		if bill.Customer.BillingAddress != "" {
			pdf.MultiCell(col1W, 5, bill.Customer.BillingAddress, "", "L", false)
		}
		if bill.Customer.GSTIN != "" {
			pdf.CellFormat(col1W, 5, "GSTIN: "+bill.Customer.GSTIN, "", 1, "L", false, 0, "")
		}
	} else {
		pdf.SetFont("Helvetica", "", 9)
		pdf.CellFormat(col1W, 6, "Walk-in Customer", "", 1, "L", false, 0, "")
	}

	yAfterLeft := pdf.GetY()

	// Right: invoice meta
	pdf.SetXY(margins+col1W, yBefore)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(30, 30, 30)
	pdf.CellFormat(col2W, 6, "INVOICE", "", 1, "R", false, 0, "")

	pdf.SetXY(margins+col1W, pdf.GetY())
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(col2W, 5, "Invoice No: "+bill.InvoiceNumber, "", 1, "R", false, 0, "")
	pdf.SetXY(margins+col1W, pdf.GetY())
	pdf.CellFormat(col2W, 5, "Date: "+bill.BillDate.Format("02 Jan 2006"), "", 1, "R", false, 0, "")
	if bill.DueDate != nil {
		pdf.SetXY(margins+col1W, pdf.GetY())
		pdf.CellFormat(col2W, 5, "Due Date: "+bill.DueDate.Format("02 Jan 2006"), "", 1, "R", false, 0, "")
	}
	pdf.SetXY(margins+col1W, pdf.GetY())
	pdf.CellFormat(col2W, 5, "Status: "+bill.Status, "", 1, "R", false, 0, "")

	if pdf.GetY() < yAfterLeft {
		pdf.SetY(yAfterLeft)
	}

	pdf.Ln(5)

	// ── Items Table ────────────────────────────────────────────────────────
	// Column widths
	colWidths := []float64{50, 18, 14, 14, 24, 20, 12, 20, 24}
	headers := []string{"Item", "HSN", "Qty", "Unit", "Price", "Discount", "GST%", "GST Amt", "Total"}
	aligns := []string{"L", "C", "C", "C", "R", "R", "C", "R", "R"}

	// Header row
	pdf.SetFillColor(50, 90, 200)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 8)
	for i, h := range headers {
		pdf.CellFormat(colWidths[i], 7, h, "1", 0, aligns[i], true, 0, "")
	}
	pdf.Ln(-1)

	// Item rows
	fill := false
	for _, item := range bill.BillItems {
		pdf.SetFont("Helvetica", "", 8)
		pdf.SetTextColor(30, 30, 30)
		if fill {
			pdf.SetFillColor(240, 244, 255)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		discStr := ""
		if item.DiscountAmount > 0 {
			if item.DiscountType == "percent" {
				discStr = fmt.Sprintf("%.1f%%", item.DiscountValue)
			} else {
				discStr = fmt.Sprintf("%.2f", item.DiscountAmount)
			}
		}

		pdf.CellFormat(colWidths[0], 6, item.Name, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(colWidths[1], 6, item.HSNCode, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[2], 6, fmt.Sprintf("%.2f", item.Quantity), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[3], 6, item.Unit, "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[4], 6, fmt.Sprintf("%.2f", item.Price), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(colWidths[5], 6, discStr, "1", 0, "R", fill, 0, "")
		pdf.CellFormat(colWidths[6], 6, fmt.Sprintf("%.1f%%", item.GSTRate), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[7], 6, fmt.Sprintf("%.2f", item.GSTAmount), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(colWidths[8], 6, fmt.Sprintf("%.2f", item.Total), "1", 0, "R", fill, 0, "")
		pdf.Ln(-1)
		fill = !fill
	}

	pdf.Ln(4)

	// ── Totals ─────────────────────────────────────────────────────────────
	summaryX := margins + contentW*0.55
	summaryW := contentW * 0.45

	printSummaryRow := func(label, value string, bold bool) {
		pdf.SetX(summaryX)
		if bold {
			pdf.SetFont("Helvetica", "B", 9)
		} else {
			pdf.SetFont("Helvetica", "", 9)
		}
		pdf.SetTextColor(30, 30, 30)
		pdf.CellFormat(summaryW*0.55, 6, label, "", 0, "L", false, 0, "")
		pdf.CellFormat(summaryW*0.45, 6, value, "", 1, "R", false, 0, "")
	}

	printSummaryRow("Subtotal", fmt.Sprintf("%.2f", bill.Subtotal), false)
	if bill.DiscountAmount > 0 {
		printSummaryRow("Discount", fmt.Sprintf("-%.2f", bill.DiscountAmount), false)
	}
	printSummaryRow("Taxable Amount", fmt.Sprintf("%.2f", bill.TaxableAmount), false)
	if bill.IsInterstate {
		printSummaryRow("IGST", fmt.Sprintf("%.2f", bill.IGSTAmount), false)
	} else {
		printSummaryRow("CGST", fmt.Sprintf("%.2f", bill.CGSTAmount), false)
		printSummaryRow("SGST", fmt.Sprintf("%.2f", bill.SGSTAmount), false)
	}

	// Grand total with colored background
	pdf.SetX(summaryX)
	pdf.SetFillColor(50, 90, 200)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(summaryW, 8, fmt.Sprintf("  Total: ₹%.2f", bill.TotalAmount), "", 1, "R", true, 0, "")

	pdf.Ln(4)

	// ── Notes ──────────────────────────────────────────────────────────────
	if bill.Notes != "" {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(30, 30, 30)
		pdf.CellFormat(contentW, 6, "Notes:", "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(80, 80, 80)
		pdf.MultiCell(contentW, 5, bill.Notes, "", "L", false)
		pdf.Ln(3)
	}

	// ── Bank Details ───────────────────────────────────────────────────────
	if bill.Account != nil && (bill.Account.AccountNumber != "" || bill.Account.UPIID != "") {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(30, 30, 30)
		pdf.CellFormat(contentW, 6, "Payment Details:", "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(80, 80, 80)
		pdf.CellFormat(contentW, 5, "Account Name: "+bill.Account.Name, "", 1, "L", false, 0, "")
		if bill.Account.AccountNumber != "" {
			pdf.CellFormat(contentW, 5, "Account No: "+bill.Account.AccountNumber, "", 1, "L", false, 0, "")
		}
		if bill.Account.IFSC != "" {
			pdf.CellFormat(contentW, 5, "IFSC: "+bill.Account.IFSC, "", 1, "L", false, 0, "")
		}
		if bill.Account.UPIID != "" {
			pdf.CellFormat(contentW, 5, "UPI: "+bill.Account.UPIID, "", 1, "L", false, 0, "")
		}
	}

	// ── Footer ─────────────────────────────────────────────────────────────
	pdf.SetY(-20)
	pdf.SetFont("Helvetica", "I", 8)
	pdf.SetTextColor(150, 150, 150)
	pdf.CellFormat(contentW, 5, "This is a computer generated invoice. No signature required.", "", 1, "C", false, 0, "")
	pdf.CellFormat(contentW, 5, "Generated by Billetra — GST Billing SaaS", "", 1, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
