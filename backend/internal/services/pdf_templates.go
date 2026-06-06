package services

import (
	"fmt"
	"strings"
)

// ── Shared content helpers ──────────────────────────────────────────────────

func (p *pdfCtx) businessAddressLines() []string {
	b := p.biz
	var lines []string
	if b.Address != "" {
		lines = append(lines, b.Address)
	}
	loc := joinNonEmpty([]string{b.City, b.State}, ", ")
	if b.Pincode != "" {
		if loc != "" {
			loc += " - " + b.Pincode
		} else {
			loc = b.Pincode
		}
	}
	if loc != "" {
		lines = append(lines, loc)
	}
	if b.Phone != "" {
		lines = append(lines, "Phone: "+b.Phone)
	}
	if b.Email != "" {
		lines = append(lines, "Email: "+b.Email)
	}
	return lines
}

func joinNonEmpty(parts []string, sep string) string {
	var out []string
	for _, s := range parts {
		if strings.TrimSpace(s) != "" {
			out = append(out, s)
		}
	}
	return strings.Join(out, sep)
}

func (p *pdfCtx) customerLines() (name string, lines []string) {
	if p.bill.Customer == nil {
		return "Walk-in Customer", nil
	}
	c := p.bill.Customer
	name = c.Name
	if c.BillingAddress != "" {
		lines = append(lines, c.BillingAddress)
	}
	if c.State != "" {
		lines = append(lines, "State: "+c.State)
	}
	if c.Phone != "" {
		lines = append(lines, "Phone: "+c.Phone)
	}
	if c.GSTIN != "" {
		lines = append(lines, "GSTIN: "+c.GSTIN)
	}
	return name, lines
}

// metaRows returns invoice meta as label/value pairs.
func (p *pdfCtx) metaRows() [][2]string {
	rows := [][2]string{
		{"Invoice No", p.bill.InvoiceNumber},
		{"Date", p.bill.BillDate.Format("02 Jan 2006")},
	}
	if p.bill.DueDate != nil {
		rows = append(rows, [2]string{"Due Date", p.bill.DueDate.Format("02 Jan 2006")})
	}
	rows = append(rows, [2]string{"Tax Type", taxType(p.bill.IsInterstate)})
	rows = append(rows, [2]string{"Status", strings.Title(p.bill.Status)})
	return rows
}

func taxType(interstate bool) string {
	if interstate {
		return "IGST (Interstate)"
	}
	return "CGST + SGST"
}

// hr draws a horizontal rule across the content width at the current Y.
func (p *pdfCtx) hr(weight float64, c rgb) {
	y := p.y()
	p.pdf.SetLineWidth(weight)
	p.draw(c)
	p.pdf.Line(p.mL, y, p.pageW-p.mR, y)
	p.pdf.SetLineWidth(0.2)
}

// standardItemsTable renders the common 8-column items grid.
func (p *pdfCtx) standardItemsTable(zebra bool, compact bool) float64 {
	cw := p.contentW
	// proportional widths
	w := []float64{0.05, 0.31, 0.10, 0.10, 0.13, 0.09, 0.09, 0.13}
	headers := []string{"#", "Item", "HSN", "Qty", "Rate", "Disc", "GST", "Amount"}
	aligns := []string{"C", "L", "C", "C", "R", "R", "C", "R"}
	for i := range w {
		w[i] *= cw
	}
	rowH := 7.0
	headH := 8.0
	fontSize := 8.5
	if compact {
		rowH, headH, fontSize = 5.5, 6.5, 7.5
	}

	// header
	p.fill(p.th.tableHead)
	p.text(p.th.tableHTxt)
	p.font("B", fontSize)
	p.pdf.SetX(p.mL)
	for i, h := range headers {
		p.pdf.CellFormat(w[i], headH, h, "", 0, aligns[i], true, 0, "")
	}
	p.ln(-1)

	// rows
	p.font("", fontSize)
	fill := false
	for idx, it := range p.bill.BillItems {
		// page break guard
		if p.y()+rowH > p.pageHeight()-p.mT {
			p.pdf.AddPage()
		}
		if zebra && fill {
			p.fill(p.th.zebra)
		} else {
			p.fill(rgb{255, 255, 255})
		}
		disc := "-"
		if it.DiscountAmount > 0 {
			if it.DiscountType == "percent" {
				disc = num(it.DiscountValue) + "%"
			} else {
				disc = indianMoney(it.DiscountAmount)
			}
		}
		p.text(p.th.body)
		p.pdf.SetX(p.mL)
		cells := []struct {
			txt   string
			align string
		}{
			{fmt.Sprintf("%d", idx+1), "C"},
			{it.Name, "L"},
			{orDash(it.HSNCode), "C"},
			{num(it.Quantity) + unitSuffix(it.Unit), "C"},
			{indianMoney(it.Price), "R"},
			{disc, "R"},
			{num(it.GSTRate) + "%", "C"},
			{indianMoney(it.Total), "R"},
		}
		// Item name may wrap; keep single-line with ellipsis-ish trim via MultiCell fallback
		for i, c := range cells {
			fillIt := zebra && fill
			p.pdf.CellFormat(w[i], rowH, p.fit(c.txt, w[i]-2, fontSize), "", 0, c.align, fillIt, 0, "")
		}
		p.ln(-1)
		fill = !fill
	}
	// bottom border line
	p.font("", fontSize)
	return p.y()
}

// gstItemsTable renders a formal GST grid with split tax columns.
func (p *pdfCtx) gstItemsTable() {
	cw := p.contentW
	inter := p.bill.IsInterstate
	var w []float64
	var headers []string
	var aligns []string
	if inter {
		w = []float64{0.06, 0.30, 0.10, 0.10, 0.13, 0.15, 0.16}
		headers = []string{"Sl", "Description", "HSN", "Qty", "Rate", "Taxable", "IGST"}
		aligns = []string{"C", "L", "C", "C", "R", "R", "R"}
	} else {
		w = []float64{0.05, 0.27, 0.09, 0.09, 0.12, 0.13, 0.125, 0.125}
		headers = []string{"Sl", "Description", "HSN", "Qty", "Rate", "Taxable", "CGST", "SGST"}
		aligns = []string{"C", "L", "C", "C", "R", "R", "R", "R"}
	}
	for i := range w {
		w[i] *= cw
	}

	p.fill(p.th.tableHead)
	p.text(p.th.tableHTxt)
	p.font("B", 8)
	p.pdf.SetX(p.mL)
	for i, h := range headers {
		p.pdf.CellFormat(w[i], 8, h, "1", 0, aligns[i], true, 0, "")
	}
	p.ln(-1)

	p.font("", 8)
	p.draw(p.th.line)
	for idx, it := range p.bill.BillItems {
		if p.y()+7 > p.pageHeight()-p.mT {
			p.pdf.AddPage()
		}
		taxable := it.Price*it.Quantity - it.DiscountAmount
		p.text(p.th.body)
		p.pdf.SetX(p.mL)
		var cells []struct {
			txt   string
			align string
		}
		if inter {
			cells = []struct {
				txt   string
				align string
			}{
				{fmt.Sprintf("%d", idx+1), "C"},
				{it.Name, "L"},
				{orDash(it.HSNCode), "C"},
				{num(it.Quantity), "C"},
				{indianMoney(it.Price), "R"},
				{indianMoney(taxable), "R"},
				{indianMoney(it.GSTAmount), "R"},
			}
		} else {
			cells = []struct {
				txt   string
				align string
			}{
				{fmt.Sprintf("%d", idx+1), "C"},
				{it.Name, "L"},
				{orDash(it.HSNCode), "C"},
				{num(it.Quantity), "C"},
				{indianMoney(it.Price), "R"},
				{indianMoney(taxable), "R"},
				{indianMoney(it.GSTAmount / 2), "R"},
				{indianMoney(it.GSTAmount / 2), "R"},
			}
		}
		for i, c := range cells {
			p.pdf.CellFormat(w[i], 7, p.fit(c.txt, w[i]-2, 8), "1", 0, c.align, false, 0, "")
		}
		p.ln(-1)
	}
}

// totalsBox renders the right-aligned totals summary. Returns ending Y.
func (p *pdfCtx) totalsBox(filledTotal bool) {
	b := p.bill
	boxW := p.contentW * 0.45
	if boxW < 70 {
		boxW = p.contentW
	}
	x := p.pageW - p.mR - boxW
	labelW := boxW * 0.55
	valW := boxW - labelW

	row := func(label, val string, bold bool) {
		p.pdf.SetX(x)
		if bold {
			p.font("B", 9.5)
		} else {
			p.font("", 9)
		}
		p.text(p.th.muted)
		p.pdf.CellFormat(labelW, 6, label, "", 0, "L", false, 0, "")
		p.text(p.th.body)
		p.pdf.CellFormat(valW, 6, val, "", 1, "R", false, 0, "")
	}

	row("Subtotal", p.money(b.Subtotal), false)
	if b.DiscountAmount > 0 {
		row("Discount", "-"+p.money(b.DiscountAmount), false)
	}
	row("Taxable Amount", p.money(b.TaxableAmount), false)
	if b.IsInterstate {
		row("IGST", p.money(b.IGSTAmount), false)
	} else {
		row("CGST", p.money(b.CGSTAmount), false)
		row("SGST", p.money(b.SGSTAmount), false)
	}

	// grand total bar
	p.pdf.SetX(x)
	if filledTotal {
		p.fill(p.th.primary)
		p.text(rgb{255, 255, 255})
	} else {
		p.fill(rgb{255, 255, 255})
		p.draw(p.th.primary)
		p.pdf.SetLineWidth(0.4)
		p.text(p.th.primary)
	}
	p.font("B", 11)
	border := ""
	if !filledTotal {
		border = "T"
	}
	p.pdf.CellFormat(labelW, 9, "  Grand Total", border, 0, "L", filledTotal, 0, "")
	p.pdf.CellFormat(valW, 9, p.money(b.TotalAmount)+"  ", border, 1, "R", filledTotal, 0, "")
	p.pdf.SetLineWidth(0.2)

	if b.PaidAmount > 0 && b.PaidAmount < b.TotalAmount {
		row("Paid", p.money(b.PaidAmount), false)
		row("Balance Due", p.money(b.TotalAmount-b.PaidAmount), true)
	}
}

// amountInWords prints "Amount in words: ..." across the content width.
func (p *pdfCtx) amountInWords() {
	p.font("B", 8.5)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(30, 5, "Amount in words:", "", 0, "L", false, 0, "")
	p.font("", 8.5)
	p.text(p.th.body)
	p.pdf.MultiCell(p.contentW-30, 5, rupeesInWords(p.bill.TotalAmount), "", "L", false)
}

// paymentAndNotes prints bank/UPI details and notes below the totals.
func (p *pdfCtx) paymentAndNotes() {
	b := p.bill
	if b.Account != nil && (b.Account.AccountNumber != "" || b.Account.UPIID != "") {
		p.font("B", 9)
		p.text(p.th.heading)
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(p.contentW, 5.5, "Payment Details", "", 1, "L", false, 0, "")
		p.font("", 8.5)
		p.text(p.th.body)
		if b.Account.Name != "" {
			p.cellLeft("A/c Name: " + b.Account.Name)
		}
		if b.Account.AccountNumber != "" {
			p.cellLeft("A/c No: " + b.Account.AccountNumber)
		}
		if b.Account.IFSC != "" {
			p.cellLeft("IFSC: " + b.Account.IFSC)
		}
		if b.Account.UPIID != "" {
			p.cellLeft("UPI: " + b.Account.UPIID)
		}
		p.ln(2)
	}
	if b.Notes != "" {
		p.font("B", 9)
		p.text(p.th.heading)
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(p.contentW, 5.5, "Notes / Terms", "", 1, "L", false, 0, "")
		p.font("", 8.5)
		p.text(p.th.muted)
		p.pdf.SetX(p.mL)
		p.pdf.MultiCell(p.contentW, 4.6, b.Notes, "", "L", false)
	}
}

func (p *pdfCtx) cellLeft(s string) {
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 4.6, s, "", 1, "L", false, 0, "")
}

func (p *pdfCtx) footer(note string) {
	p.pdf.SetAutoPageBreak(false, 0)
	defer p.pdf.SetAutoPageBreak(true, p.mT)
	p.pdf.SetY(-16)
	p.draw(p.th.line)
	p.pdf.SetLineWidth(0.2)
	p.pdf.Line(p.mL, p.y(), p.pageW-p.mR, p.y())
	p.ln(2)
	p.font("", 7.5)
	p.text(p.th.muted)
	p.pdf.CellFormat(p.contentW, 4, note, "", 1, "C", false, 0, "")
	p.pdf.CellFormat(p.contentW, 4, "Generated by Billetra · billetra.in · 8920039064", "", 1, "C", false, 0, "")
}

func (p *pdfCtx) pageHeight() float64 {
	_, h := p.pdf.GetPageSize()
	return h
}

// fit trims text to fit a column width, adding an ellipsis when needed.
func (p *pdfCtx) fit(s string, maxW float64, size float64) string {
	p.pdf.SetFontSize(size)
	if p.pdf.GetStringWidth(s) <= maxW {
		return s
	}
	for len(s) > 1 {
		s = s[:len(s)-1]
		if p.pdf.GetStringWidth(s+"…") <= maxW {
			return s + "…"
		}
	}
	return s
}

func orDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "-"
	}
	return s
}

func unitSuffix(u string) string {
	if u == "" {
		return ""
	}
	return " " + u
}

// ── Templates ────────────────────────────────────────────────────────────

func renderModern(p *pdfCtx) {
	if _, h := p.drawLogo(p.mL, p.y(), 30, 16, "L"); h > 0 {
		p.setY(p.y() + h + 3)
	}
	// Business name
	p.font("B", 20)
	p.text(p.th.primary)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW*0.6, 9, p.biz.Name, "", 0, "L", false, 0, "")
	// Invoice title (right)
	p.font("B", 20)
	p.text(p.th.heading)
	p.pdf.CellFormat(p.contentW*0.4, 9, "TAX INVOICE", "", 1, "R", false, 0, "")

	yTop := p.y()
	// business address (left)
	p.font("", 8.5)
	p.text(p.th.muted)
	for _, l := range p.businessAddressLines() {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(p.contentW*0.6, 4.6, l, "", 1, "L", false, 0, "")
	}
	if p.biz.GSTIN != "" {
		p.pdf.SetX(p.mL)
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.CellFormat(p.contentW*0.6, 4.6, "GSTIN: "+p.biz.GSTIN, "", 1, "L", false, 0, "")
	}
	leftEnd := p.y()

	// meta (right)
	p.setY(yTop)
	for _, m := range p.metaRows() {
		p.pdf.SetX(p.mL + p.contentW*0.55)
		p.font("", 8.5)
		p.text(p.th.muted)
		p.pdf.CellFormat(p.contentW*0.2, 5, m[0], "", 0, "R", false, 0, "")
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.CellFormat(p.contentW*0.25, 5, "  "+m[1], "", 1, "R", false, 0, "")
	}
	if p.y() < leftEnd {
		p.setY(leftEnd)
	}
	p.ln(3)
	p.hr(0.8, p.th.primary)
	p.ln(4)

	// Bill to
	p.font("B", 9)
	p.text(p.th.primary)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 5, "BILL TO", "", 1, "L", false, 0, "")
	name, lines := p.customerLines()
	p.font("B", 11)
	p.text(p.th.heading)
	p.cellLeft(name)
	p.font("", 8.5)
	p.text(p.th.muted)
	for _, l := range lines {
		p.cellLeft(l)
	}
	p.ln(4)

	p.standardItemsTable(true, false)
	p.ln(4)
	p.totalsBox(true)
	p.ln(3)
	p.amountInWords()
	p.ln(4)
	p.paymentAndNotes()
	p.footer("This is a computer-generated invoice and does not require a signature.")
}

func renderClassicGST(p *pdfCtx) {
	// Outer frame
	top := p.mT
	p.draw(p.th.line)
	p.pdf.SetLineWidth(0.5)
	if _, h := p.drawLogo(p.mL, p.y(), p.contentW, 16, "C"); h > 0 {
		p.setY(p.y() + h + 3)
	}
	// Title
	p.font("B", 9)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 5, "TAX INVOICE", "", 1, "C", false, 0, "")
	p.font("B", 16)
	p.text(p.th.primary)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 8, p.biz.Name, "", 1, "C", false, 0, "")
	p.font("", 8.5)
	p.text(p.th.body)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 4.6, joinNonEmpty(p.businessAddressLines(), "  ·  "), "", 1, "C", false, 0, "")
	gstLine := joinNonEmpty([]string{nz(p.biz.GSTIN, "GSTIN: "+p.biz.GSTIN), nz(p.biz.PAN, "PAN: "+p.biz.PAN)}, "    ")
	if gstLine != "" {
		p.font("B", 8.5)
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(p.contentW, 4.6, gstLine, "", 1, "C", false, 0, "")
	}
	p.ln(2)
	p.hr(0.5, p.th.line)
	p.ln(2)

	// Buyer + invoice meta two boxes
	colW := p.contentW / 2
	yBox := p.y()
	p.font("B", 8.5)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5, "Details of Receiver (Billed To)", "", 1, "L", false, 0, "")
	name, lines := p.customerLines()
	p.font("B", 10)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5, name, "", 1, "L", false, 0, "")
	p.font("", 8.5)
	p.text(p.th.body)
	for _, l := range lines {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(colW, 4.4, l, "", 1, "L", false, 0, "")
	}
	leftEnd := p.y()

	p.setY(yBox)
	for _, m := range p.metaRows() {
		p.pdf.SetX(p.mL + colW)
		p.font("", 8.5)
		p.text(p.th.muted)
		p.pdf.CellFormat(colW*0.45, 5, m[0], "", 0, "L", false, 0, "")
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.CellFormat(colW*0.55, 5, m[1], "", 1, "L", false, 0, "")
	}
	if p.y() < leftEnd {
		p.setY(leftEnd)
	}
	p.ln(3)

	p.gstItemsTable()
	p.ln(3)
	p.totalsBox(false)
	p.ln(2)
	p.amountInWords()
	p.ln(3)
	p.paymentAndNotes()

	// Declaration + signature
	p.ln(4)
	p.font("", 7.5)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL)
	p.pdf.MultiCell(p.contentW*0.6, 4, "Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", "", "L", false)
	sy := p.y() - 12
	if sy < p.y()-16 {
		sy = p.y()
	}
	p.setY(sy)
	p.font("B", 9)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL + p.contentW*0.62)
	p.pdf.CellFormat(p.contentW*0.38, 5, "For "+p.biz.Name, "", 2, "R", false, 0, "")
	p.ln(8)
	p.font("", 8)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL + p.contentW*0.62)
	p.pdf.CellFormat(p.contentW*0.38, 5, "Authorised Signatory", "", 1, "R", false, 0, "")
	_ = top
	p.footer("Subject to local jurisdiction. E. & O.E.")
}

func renderCorporate(p *pdfCtx) {
	// full-width colour band
	bandH := 30.0
	p.fill(p.th.primary)
	p.pdf.Rect(0, 0, p.pageW, bandH, "F")
	// thin accent strip
	p.fill(p.th.primaryAlt)
	p.pdf.Rect(0, bandH, p.pageW, 1.5, "F")

	off := 0.0
	if lw, _ := p.drawLogo(p.mL, 4, 18, 13, "L"); lw > 0 {
		off = lw + 3
	}
	p.pdf.SetXY(p.mL+off, 9)
	p.font("B", 20)
	p.text(rgb{255, 255, 255})
	p.pdf.CellFormat(p.contentW*0.6-off, 9, p.biz.Name, "", 0, "L", false, 0, "")
	p.font("B", 16)
	p.pdf.CellFormat(p.contentW*0.4, 9, "INVOICE", "", 1, "R", false, 0, "")
	p.pdf.SetX(p.mL)
	p.font("", 8.5)
	p.text(rgb{235, 238, 250})
	p.pdf.CellFormat(p.contentW*0.6, 5, joinNonEmpty([]string{p.biz.Phone, p.biz.Email}, "  ·  "), "", 0, "L", false, 0, "")
	p.pdf.CellFormat(p.contentW*0.4, 5, "#"+p.bill.InvoiceNumber, "", 1, "R", false, 0, "")

	p.setY(bandH + 8)

	// Bill to + meta
	colW := p.contentW / 2
	yBox := p.y()
	p.font("B", 9)
	p.text(p.th.primary)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5, "BILL TO", "", 1, "L", false, 0, "")
	name, lines := p.customerLines()
	p.font("B", 11)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5.5, name, "", 1, "L", false, 0, "")
	p.font("", 8.5)
	p.text(p.th.muted)
	for _, l := range lines {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(colW, 4.4, l, "", 1, "L", false, 0, "")
	}
	leftEnd := p.y()
	p.setY(yBox)
	for _, m := range p.metaRows() {
		p.pdf.SetX(p.mL + colW)
		p.font("", 8.5)
		p.text(p.th.muted)
		p.pdf.CellFormat(colW*0.5, 5, m[0], "", 0, "R", false, 0, "")
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.CellFormat(colW*0.5, 5, "  "+m[1], "", 1, "R", false, 0, "")
	}
	if p.y() < leftEnd {
		p.setY(leftEnd)
	}
	if p.biz.GSTIN != "" {
		p.ln(1)
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(p.contentW, 4.6, "Seller GSTIN: "+p.biz.GSTIN, "", 1, "L", false, 0, "")
	}
	p.ln(3)

	p.standardItemsTable(true, false)
	p.ln(4)
	p.totalsBox(true)
	p.ln(3)
	p.amountInWords()
	p.ln(4)
	p.paymentAndNotes()
	p.footer("Thank you for your business. Payment due within the stated terms.")
}

func renderElegant(p *pdfCtx) {
	black := rgb{17, 24, 39}
	if _, h := p.drawLogo(p.mL, p.y(), 26, 14, "L"); h > 0 {
		p.setY(p.y() + h + 3)
	}
	// Big spaced title
	p.font("B", 22)
	p.text(black)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 11, spaced("INVOICE"), "", 1, "L", false, 0, "")
	p.font("", 9)
	p.text(black)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 5, strings.ToUpper(p.biz.Name), "", 1, "L", false, 0, "")
	p.font("", 8)
	p.text(p.th.muted)
	for _, l := range p.businessAddressLines() {
		p.cellLeft(l)
	}
	if p.biz.GSTIN != "" {
		p.cellLeft("GSTIN " + p.biz.GSTIN)
	}
	p.ln(2)
	p.hr(0.3, black)
	p.ln(3)

	// meta inline
	colW := p.contentW / 2
	yBox := p.y()
	p.font("B", 8)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5, spaced("BILLED TO"), "", 1, "L", false, 0, "")
	name, lines := p.customerLines()
	p.font("B", 10)
	p.text(black)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5, name, "", 1, "L", false, 0, "")
	p.font("", 8)
	p.text(p.th.body)
	for _, l := range lines {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(colW, 4.4, l, "", 1, "L", false, 0, "")
	}
	leftEnd := p.y()
	p.setY(yBox)
	for _, m := range p.metaRows() {
		p.pdf.SetX(p.mL + colW)
		p.font("", 8)
		p.text(p.th.muted)
		p.pdf.CellFormat(colW*0.5, 5, strings.ToUpper(m[0]), "", 0, "R", false, 0, "")
		p.font("B", 8)
		p.text(black)
		p.pdf.CellFormat(colW*0.5, 5, "  "+m[1], "", 1, "R", false, 0, "")
	}
	if p.y() < leftEnd {
		p.setY(leftEnd)
	}
	p.ln(3)

	p.standardItemsTable(false, false)
	p.ln(1)
	p.hr(0.3, black)
	p.ln(3)
	p.totalsBox(false)
	p.ln(3)
	p.amountInWords()
	p.ln(4)
	p.paymentAndNotes()
	p.footer("Thank you.")
}

func renderRetail(p *pdfCtx) {
	if _, h := p.drawLogo(p.mL, p.y(), 24, 12, "L"); h > 0 {
		p.setY(p.y() + h + 2)
	}
	p.font("B", 15)
	p.text(p.th.primary)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW*0.65, 7, p.biz.Name, "", 0, "L", false, 0, "")
	p.font("B", 12)
	p.text(p.th.heading)
	p.pdf.CellFormat(p.contentW*0.35, 7, "INVOICE", "", 1, "R", false, 0, "")
	p.font("", 7.5)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW*0.65, 4, joinNonEmpty(p.businessAddressLines(), " · "), "", 0, "L", false, 0, "")
	p.pdf.CellFormat(p.contentW*0.35, 4, "#"+p.bill.InvoiceNumber, "", 1, "R", false, 0, "")
	p.pdf.SetX(p.mL)
	gst := ""
	if p.biz.GSTIN != "" {
		gst = "GSTIN: " + p.biz.GSTIN
	}
	name, _ := p.customerLines()
	p.pdf.CellFormat(p.contentW*0.65, 4, gst, "", 0, "L", false, 0, "")
	p.pdf.CellFormat(p.contentW*0.35, 4, p.bill.BillDate.Format("02 Jan 2006"), "", 1, "R", false, 0, "")
	p.pdf.SetX(p.mL)
	p.font("B", 8)
	p.text(p.th.body)
	p.pdf.CellFormat(p.contentW, 5, "Customer: "+name, "", 1, "L", false, 0, "")
	p.ln(1)

	p.standardItemsTable(true, true)
	p.ln(3)
	p.totalsBox(true)
	p.ln(2)
	p.amountInWords()
	p.ln(3)
	p.paymentAndNotes()
	p.footer("Thank you. Visit again!")
}

func renderThermal(p *pdfCtx) {
	cw := p.contentW
	center := func(s string, size float64, bold bool) {
		if bold {
			p.font("B", size)
		} else {
			p.font("", size)
		}
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(cw, size*0.5+1.5, s, "", 1, "C", false, 0, "")
	}
	dashed := func() {
		p.font("", 7)
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(cw, 3.5, strings.Repeat("-", 48), "", 1, "C", false, 0, "")
	}
	if _, h := p.drawLogo(p.mL, p.y(), p.contentW, 18, "C"); h > 0 {
		p.setY(p.y() + h + 2)
	}
	p.text(p.th.heading)
	center(p.biz.Name, 11, true)
	p.text(p.th.muted)
	for _, l := range p.businessAddressLines() {
		center(l, 7, false)
	}
	if p.biz.GSTIN != "" {
		center("GSTIN: "+p.biz.GSTIN, 7, false)
	}
	dashed()
	p.text(p.th.body)
	p.font("", 7.5)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(cw, 4, "Invoice: "+p.bill.InvoiceNumber, "", 1, "L", false, 0, "")
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(cw, 4, "Date: "+p.bill.BillDate.Format("02 Jan 2006 15:04"), "", 1, "L", false, 0, "")
	name, _ := p.customerLines()
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(cw, 4, "Customer: "+name, "", 1, "L", false, 0, "")
	dashed()

	// item header
	p.font("B", 7)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(cw*0.5, 4, "Item", "", 0, "L", false, 0, "")
	p.pdf.CellFormat(cw*0.2, 4, "Qty", "", 0, "C", false, 0, "")
	p.pdf.CellFormat(cw*0.3, 4, "Amt", "", 1, "R", false, 0, "")
	p.font("", 7)
	p.text(p.th.body)
	for _, it := range p.bill.BillItems {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(cw, 3.8, p.fit(it.Name, cw, 7), "", 1, "L", false, 0, "")
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(cw*0.5, 3.8, "  "+num(it.Quantity)+" x "+indianMoney(it.Price), "", 0, "L", false, 0, "")
		p.pdf.CellFormat(cw*0.2, 3.8, num(it.GSTRate)+"%", "", 0, "C", false, 0, "")
		p.pdf.CellFormat(cw*0.3, 3.8, indianMoney(it.Total), "", 1, "R", false, 0, "")
	}
	dashed()

	tline := func(label, val string, bold bool) {
		if bold {
			p.font("B", 8.5)
		} else {
			p.font("", 7.5)
		}
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(cw*0.6, 4.2, label, "", 0, "L", false, 0, "")
		p.pdf.CellFormat(cw*0.4, 4.2, val, "", 1, "R", false, 0, "")
	}
	tline("Subtotal", p.money(p.bill.Subtotal), false)
	if p.bill.DiscountAmount > 0 {
		tline("Discount", "-"+p.money(p.bill.DiscountAmount), false)
	}
	if p.bill.IsInterstate {
		tline("IGST", p.money(p.bill.IGSTAmount), false)
	} else {
		tline("CGST", p.money(p.bill.CGSTAmount), false)
		tline("SGST", p.money(p.bill.SGSTAmount), false)
	}
	dashed()
	tline("TOTAL", p.money(p.bill.TotalAmount), true)
	dashed()
	p.text(p.th.muted)
	center("Thank you, visit again!", 8, false)
	if p.bill.Account != nil && p.bill.Account.UPIID != "" {
		center("Pay via UPI: "+p.bill.Account.UPIID, 7, false)
	}
}

func renderRoyal(p *pdfCtx) {
	navy := p.th.primary
	gold := p.th.primaryAlt
	// double frame
	p.draw(gold)
	p.pdf.SetLineWidth(1.0)
	p.pdf.Rect(p.mL-4, p.mT-4, p.contentW+8, p.pageHeight()-2*p.mT+8, "D")
	p.pdf.SetLineWidth(0.3)
	p.pdf.Rect(p.mL-2, p.mT-2, p.contentW+4, p.pageHeight()-2*p.mT+4, "D")
	p.pdf.SetLineWidth(0.2)

	if _, h := p.drawLogo(p.mL, p.y(), p.contentW, 16, "C"); h > 0 {
		p.setY(p.y() + h + 3)
	}

	// header
	p.font("B", 21)
	p.text(navy)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 10, p.biz.Name, "", 1, "C", false, 0, "")
	p.font("", 8.5)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 4.6, joinNonEmpty(p.businessAddressLines(), "  ·  "), "", 1, "C", false, 0, "")
	if p.biz.GSTIN != "" {
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(p.contentW, 4.6, "GSTIN: "+p.biz.GSTIN, "", 1, "C", false, 0, "")
	}
	p.ln(2)
	// gold divider with center label
	p.hr(0.6, gold)
	p.ln(1)
	p.font("B", 10)
	p.text(gold)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 6, spaced("TAX INVOICE"), "", 1, "C", false, 0, "")
	p.ln(1)

	colW := p.contentW / 2
	yBox := p.y()
	p.font("B", 9)
	p.text(navy)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5, "BILL TO", "", 1, "L", false, 0, "")
	name, lines := p.customerLines()
	p.font("B", 11)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(colW, 5.5, name, "", 1, "L", false, 0, "")
	p.font("", 8.5)
	p.text(p.th.muted)
	for _, l := range lines {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(colW, 4.4, l, "", 1, "L", false, 0, "")
	}
	leftEnd := p.y()
	p.setY(yBox)
	for _, m := range p.metaRows() {
		p.pdf.SetX(p.mL + colW)
		p.font("", 8.5)
		p.text(p.th.muted)
		p.pdf.CellFormat(colW*0.5, 5, m[0], "", 0, "R", false, 0, "")
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.CellFormat(colW*0.5, 5, "  "+m[1], "", 1, "R", false, 0, "")
	}
	if p.y() < leftEnd {
		p.setY(leftEnd)
	}
	p.ln(3)

	p.standardItemsTable(true, false)
	p.ln(4)
	p.totalsBox(true)
	p.ln(3)
	p.amountInWords()
	p.ln(4)
	p.paymentAndNotes()

	p.ln(6)
	p.font("B", 9)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL + p.contentW*0.6)
	p.pdf.CellFormat(p.contentW*0.4, 5, "For "+p.biz.Name, "", 1, "R", false, 0, "")
	p.ln(8)
	p.font("", 8)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL + p.contentW*0.6)
	p.pdf.CellFormat(p.contentW*0.4, 5, "Authorised Signatory", "", 1, "R", false, 0, "")
}

func renderMinimal(p *pdfCtx) {
	if _, h := p.drawLogo(p.mL, p.y(), 28, 14, "L"); h > 0 {
		p.setY(p.y() + h + 3)
	}
	p.font("B", 18)
	p.text(p.th.heading)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 9, p.biz.Name, "", 1, "L", false, 0, "")
	// single accent line
	p.fill(p.th.primary)
	p.pdf.Rect(p.mL, p.y(), 28, 1.2, "F")
	p.ln(5)

	p.font("", 8.5)
	p.text(p.th.muted)
	colW := p.contentW / 2
	yBox := p.y()
	for _, l := range p.businessAddressLines() {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(colW, 4.6, l, "", 1, "L", false, 0, "")
	}
	if p.biz.GSTIN != "" {
		p.pdf.SetX(p.mL)
		p.pdf.CellFormat(colW, 4.6, "GSTIN: "+p.biz.GSTIN, "", 1, "L", false, 0, "")
	}
	leftEnd := p.y()
	p.setY(yBox)
	p.font("B", 16)
	p.text(p.th.primary)
	p.pdf.SetX(p.mL + colW)
	p.pdf.CellFormat(colW, 8, "Invoice", "", 1, "R", false, 0, "")
	for _, m := range p.metaRows() {
		p.pdf.SetX(p.mL + colW)
		p.font("", 8.5)
		p.text(p.th.muted)
		p.pdf.CellFormat(colW*0.5, 4.8, m[0], "", 0, "R", false, 0, "")
		p.font("B", 8.5)
		p.text(p.th.body)
		p.pdf.CellFormat(colW*0.5, 4.8, "  "+m[1], "", 1, "R", false, 0, "")
	}
	if p.y() < leftEnd {
		p.setY(leftEnd)
	}
	p.ln(5)

	p.font("", 8)
	p.text(p.th.muted)
	p.pdf.SetX(p.mL)
	p.pdf.CellFormat(p.contentW, 4.6, "Billed to", "", 1, "L", false, 0, "")
	name, lines := p.customerLines()
	p.font("B", 11)
	p.text(p.th.heading)
	p.cellLeft(name)
	p.font("", 8.5)
	p.text(p.th.muted)
	for _, l := range lines {
		p.cellLeft(l)
	}
	p.ln(4)

	p.standardItemsTable(false, false)
	p.ln(4)
	p.totalsBox(false)
	p.ln(3)
	p.amountInWords()
	p.ln(4)
	p.paymentAndNotes()
	p.footer("This is a computer-generated invoice.")
}

// ── small utils ──────────────────────────────────────────────────────────

func nz(v, withVal string) string {
	if strings.TrimSpace(v) == "" {
		return ""
	}
	return withVal
}

// spaced inserts a thin space between characters for a letter-spaced look.
func spaced(s string) string {
	parts := strings.Split(s, "")
	return strings.Join(parts, " ")
}
