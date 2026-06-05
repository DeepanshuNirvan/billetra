package services

import (
	"bytes"
	"encoding/base64"
	_ "embed"
	"fmt"
	"strings"
	"time"

	"github.com/billetra/backend/internal/models"
	"github.com/jung-kurt/gofpdf/v2"
)

// Embedded Unicode fonts (contain the ₹ glyph + clean typography).
//
//go:embed fonts/Sans-Regular.ttf
var fontSansRegular []byte

//go:embed fonts/Sans-Bold.ttf
var fontSansBold []byte

type PDFService struct{}

func NewPDFService() *PDFService { return &PDFService{} }

// ── Template registry ──────────────────────────────────────────────────────

// TemplateInfo describes a selectable invoice template (exposed to the API).
type TemplateInfo struct {
	Value       string `json:"value"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Accent      string `json:"accent"` // hex, used by the frontend chip
}

// Templates is the canonical list. Frontend and backend agree on these slugs.
var Templates = []TemplateInfo{
	{"modern", "Modern", "Clean indigo accent, zebra rows. Great default.", "#4f46e5"},
	{"classic_gst", "Classic GST", "Formal bordered tax invoice with CGST/SGST columns.", "#1e3a8a"},
	{"corporate", "Corporate", "Bold full-width colour header band.", "#0f766e"},
	{"elegant", "Elegant B/W", "Refined black & white, hairline rules.", "#111827"},
	{"retail", "Retail Compact", "Dense compact layout for quick counter bills.", "#b91c1c"},
	{"thermal", "Thermal 80mm", "Narrow thermal-printer receipt.", "#374151"},
	{"royal", "Royal", "Navy & gold double-frame premium look.", "#1e3a8a"},
	{"minimal", "Minimal", "Ultra-clean, lots of whitespace, single accent line.", "#0ea5e9"},
}

var templateSet = func() map[string]bool {
	m := map[string]bool{}
	for _, t := range Templates {
		m[t.Value] = true
	}
	return m
}()

// legacy maps the old frontend constants to canonical slugs.
var legacyTemplate = map[string]string{
	"MODERN_MINIMAL": "minimal",
	"CLASSIC_GST":    "classic_gst",
	"RETAIL_COMPACT": "retail",
	"THERMAL":        "thermal",
	"CORPORATE":      "corporate",
	"modern_minimal": "minimal",
}

func normalizeTemplate(t string) string {
	t = strings.TrimSpace(t)
	if v, ok := legacyTemplate[t]; ok {
		return v
	}
	t = strings.ToLower(t)
	if templateSet[t] {
		return t
	}
	return "modern"
}

func normalizeSize(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "a4_landscape":
		return "a4_landscape"
	case "thermal_3", "thermal", "thermal_4":
		return "thermal"
	case "half_a4":
		return "half_a4"
	default:
		return "a4_portrait"
	}
}

// ── Theme ───────────────────────────────────────────────────────────────────

type rgb struct{ r, g, b int }

type theme struct {
	primary    rgb // main brand colour
	primaryAlt rgb // gradient/secondary
	heading    rgb // dark heading text
	body       rgb // body text
	muted      rgb // secondary text
	line       rgb // rules / borders
	zebra      rgb // alternating row fill
	tableHead  rgb // items header fill
	tableHTxt  rgb // items header text
	mono       bool
	accentHex  string
}

func themeFor(tpl string) theme {
	base := theme{
		heading:   rgb{17, 24, 39},
		body:      rgb{38, 43, 54},
		muted:     rgb{107, 114, 128},
		line:      rgb{226, 230, 236},
		zebra:     rgb{246, 247, 251},
		tableHTxt: rgb{255, 255, 255},
	}
	switch tpl {
	case "classic_gst":
		base.primary = rgb{30, 58, 138}
		base.primaryAlt = rgb{30, 58, 138}
		base.tableHead = rgb{30, 58, 138}
		base.line = rgb{120, 130, 150}
		base.zebra = rgb{243, 246, 252}
	case "corporate":
		base.primary = rgb{15, 118, 110}
		base.primaryAlt = rgb{13, 148, 136}
		base.tableHead = rgb{15, 118, 110}
		base.zebra = rgb{240, 250, 248}
	case "elegant":
		base.primary = rgb{17, 24, 39}
		base.primaryAlt = rgb{17, 24, 39}
		base.tableHead = rgb{17, 24, 39}
		base.line = rgb{17, 24, 39}
		base.zebra = rgb{248, 248, 248}
		base.mono = true
	case "retail":
		base.primary = rgb{185, 28, 28}
		base.primaryAlt = rgb{220, 38, 38}
		base.tableHead = rgb{185, 28, 28}
		base.zebra = rgb{253, 245, 245}
	case "thermal":
		base.primary = rgb{17, 24, 39}
		base.primaryAlt = rgb{17, 24, 39}
		base.tableHead = rgb{55, 65, 81}
		base.line = rgb{120, 120, 120}
		base.mono = true
	case "royal":
		base.primary = rgb{30, 41, 99}
		base.primaryAlt = rgb{180, 140, 50}
		base.tableHead = rgb{30, 41, 99}
		base.line = rgb{180, 140, 50}
		base.zebra = rgb{248, 245, 236}
	case "minimal":
		base.primary = rgb{14, 165, 233}
		base.primaryAlt = rgb{14, 165, 233}
		base.tableHead = rgb{241, 245, 249}
		base.tableHTxt = rgb{17, 24, 39}
		base.line = rgb{226, 232, 240}
		base.zebra = rgb{249, 250, 251}
	default: // modern
		base.primary = rgb{79, 70, 229}
		base.primaryAlt = rgb{99, 102, 241}
		base.tableHead = rgb{79, 70, 229}
		base.zebra = rgb{246, 247, 255}
	}
	return base
}

// ── Render context ────────────────────────────────────────────────────────

type pdfCtx struct {
	pdf      *gofpdf.Fpdf
	bill     *models.Bill
	biz      *models.Business
	th       theme
	mL, mR   float64
	mT       float64
	pageW    float64
	contentW float64
}

func (p *pdfCtx) font(style string, size float64) {
	// Map bold -> "B", everything else regular. Italic falls back to regular
	// since the embedded family only ships regular + bold.
	st := ""
	if strings.Contains(style, "B") {
		st = "B"
	}
	p.pdf.SetFont("Sans", st, size)
}

// decodeDataURIImage parses a "data:image/...;base64,..." URI into raw bytes
// and a gofpdf image type. Returns ok=false for anything it can't render.
func decodeDataURIImage(uri string) ([]byte, string, bool) {
	if !strings.HasPrefix(uri, "data:") {
		return nil, "", false
	}
	comma := strings.IndexByte(uri, ',')
	if comma < 0 {
		return nil, "", false
	}
	meta := uri[len("data:"):comma]
	if !strings.Contains(meta, "base64") {
		return nil, "", false
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(uri[comma+1:]))
	if err != nil || len(raw) == 0 {
		return nil, "", false
	}
	var typ string
	switch {
	case strings.Contains(meta, "jpeg"), strings.Contains(meta, "jpg"):
		typ = "JPG"
	case strings.Contains(meta, "png"):
		typ = "PNG"
	case strings.Contains(meta, "gif"):
		typ = "GIF"
	default:
		return nil, "", false
	}
	return raw, typ, true
}

// drawLogo renders the business logo inside the box (x,y,wMax,hMax), preserving
// aspect ratio and anchoring horizontally per align ("L","C","R"). It returns
// the width and height actually drawn (0,0 when there is no usable logo).
func (p *pdfCtx) drawLogo(x, y, wMax, hMax float64, align string) (w float64, h float64) {
	if p.biz == nil || !p.biz.ShowLogoOnBills || strings.TrimSpace(p.biz.LogoURL) == "" {
		return 0, 0
	}
	raw, typ, ok := decodeDataURIImage(p.biz.LogoURL)
	if !ok {
		return 0, 0
	}
	// gofpdf panics on some malformed/unsupported images. Never let a bad logo
	// crash the whole invoice — just skip it.
	defer func() {
		if r := recover(); r != nil {
			p.pdf.ClearError()
			w, h = 0, 0
		}
	}()
	opt := gofpdf.ImageOptions{ImageType: typ}
	info := p.pdf.RegisterImageOptionsReader("biz-logo", opt, bytes.NewReader(raw))
	if info == nil || p.pdf.Err() {
		p.pdf.ClearError()
		return 0, 0
	}
	iw, ih := info.Extent()
	if iw <= 0 || ih <= 0 {
		return 0, 0
	}
	scale := wMax / iw
	if ih*scale > hMax {
		scale = hMax / ih
	}
	w, h = iw*scale, ih*scale
	dx := x
	switch align {
	case "C":
		dx = x + (wMax-w)/2
	case "R":
		dx = x + (wMax - w)
	}
	p.pdf.ImageOptions("biz-logo", dx, y, w, h, false, opt, 0, "")
	if p.pdf.Err() {
		p.pdf.ClearError()
		return 0, 0
	}
	return w, h
}

func (p *pdfCtx) text(c rgb)     { p.pdf.SetTextColor(c.r, c.g, c.b) }
func (p *pdfCtx) fill(c rgb)     { p.pdf.SetFillColor(c.r, c.g, c.b) }
func (p *pdfCtx) draw(c rgb)     { p.pdf.SetDrawColor(c.r, c.g, c.b) }
func (p *pdfCtx) x() float64     { return p.pdf.GetX() }
func (p *pdfCtx) y() float64     { return p.pdf.GetY() }
func (p *pdfCtx) setY(v float64) { p.pdf.SetY(v) }
func (p *pdfCtx) ln(h float64)   { p.pdf.Ln(h) }

// money formats an amount with the ₹ symbol and Indian digit grouping.
func (p *pdfCtx) money(v float64) string { return "₹" + indianMoney(v) }

// indianMoney renders 1234567.5 as "12,34,567.50".
func indianMoney(v float64) string {
	neg := v < 0
	if neg {
		v = -v
	}
	s := fmt.Sprintf("%.2f", v)
	parts := strings.SplitN(s, ".", 2)
	intPart, dec := parts[0], parts[1]

	var grouped string
	n := len(intPart)
	if n <= 3 {
		grouped = intPart
	} else {
		last3 := intPart[n-3:]
		rest := intPart[:n-3]
		var chunks []string
		for len(rest) > 2 {
			chunks = append([]string{rest[len(rest)-2:]}, chunks...)
			rest = rest[:len(rest)-2]
		}
		if len(rest) > 0 {
			chunks = append([]string{rest}, chunks...)
		}
		grouped = strings.Join(chunks, ",") + "," + last3
	}
	out := grouped + "." + dec
	if neg {
		out = "-" + out
	}
	return out
}

func num(v float64) string {
	s := fmt.Sprintf("%.2f", v)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	if s == "" {
		s = "0"
	}
	return s
}

// ── Entry point ──────────────────────────────────────────────────────────

// GenerateBillPDF renders the bill using the template stored on the bill.
func (s *PDFService) GenerateBillPDF(bill *models.Bill, business *models.Business) ([]byte, error) {
	tpl := normalizeTemplate(bill.Template)
	size := normalizeSize(bill.BillSize)
	if tpl == "thermal" {
		size = "thermal"
	}

	var pdf *gofpdf.Fpdf
	switch size {
	case "thermal":
		pdf = gofpdf.NewCustom(&gofpdf.InitType{
			UnitStr: "mm",
			Size:    gofpdf.SizeType{Wd: 80, Ht: 297},
		})
	case "a4_landscape":
		pdf = gofpdf.New("L", "mm", "A4", "")
	default:
		pdf = gofpdf.New("P", "mm", "A4", "")
	}

	// Register embedded UTF-8 fonts.
	pdf.AddUTF8FontFromBytes("Sans", "", fontSansRegular)
	pdf.AddUTF8FontFromBytes("Sans", "B", fontSansBold)
	pdf.SetFont("Sans", "", 10)

	pdf.AddPage()

	pageW, _ := pdf.GetPageSize()
	margin := 14.0
	if size == "thermal" {
		margin = 5.0
	}
	pdf.SetMargins(margin, margin, margin)
	pdf.SetAutoPageBreak(true, margin)

	p := &pdfCtx{
		pdf:      pdf,
		bill:     bill,
		biz:      business,
		th:       themeFor(tpl),
		mL:       margin,
		mR:       margin,
		mT:       margin,
		pageW:    pageW,
		contentW: pageW - 2*margin,
	}

	switch tpl {
	case "classic_gst":
		renderClassicGST(p)
	case "corporate":
		renderCorporate(p)
	case "elegant":
		renderElegant(p)
	case "retail":
		renderRetail(p)
	case "thermal":
		renderThermal(p)
	case "royal":
		renderRoyal(p)
	case "minimal":
		renderMinimal(p)
	default:
		renderModern(p)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// SampleBill builds a realistic dummy bill for template previews.
func SampleBill() (*models.Bill, *models.Business) {
	due := time.Now().AddDate(0, 0, 15)
	biz := &models.Business{
		Name:    "Acme Traders Pvt. Ltd.",
		GSTIN:   "27AABCU9603R1ZM",
		PAN:     "AABCU9603R",
		Phone:   "+91 98765 43210",
		Email:   "billing@acmetraders.in",
		Address: "402, Trade Centre, MG Road",
		City:    "Pune",
		State:   "Maharashtra",
		Pincode: "411001",
	}
	cust := &models.Customer{
		Name:           "Bright Retail Solutions",
		Phone:          "+91 91234 56780",
		GSTIN:          "27AraTV1234C1Z5",
		BillingAddress: "Shop 12, Market Yard, FC Road, Pune 411004",
		State:          "Maharashtra",
	}
	acc := &models.Account{
		Name:          "Acme Traders Current A/c",
		AccountNumber: "50100123456789",
		IFSC:          "HDFC0000123",
		UPIID:         "acmetraders@hdfcbank",
	}
	items := []models.BillItem{
		{Name: "Premium Ball Pen (Box of 10)", HSNCode: "9608", Quantity: 12, Unit: "Box", Price: 250, GSTRate: 18, GSTAmount: 540, Total: 3540},
		{Name: "A4 Copier Paper 75 GSM", HSNCode: "4802", Quantity: 30, Unit: "Ream", Price: 320, GSTRate: 12, GSTAmount: 1152, Total: 10752},
		{Name: "Spiral Notebook 200 pages", HSNCode: "4820", Quantity: 50, Unit: "Pieces", Price: 60, GSTRate: 12, GSTAmount: 360, Total: 3360},
		{Name: "Stapler Heavy Duty", HSNCode: "8305", Quantity: 8, Unit: "Pieces", Price: 480, GSTRate: 18, GSTAmount: 691.2, Total: 4531.2},
	}
	var taxable, tax float64
	for i := range items {
		line := items[i].Price * items[i].Quantity
		items[i].DiscountType = "fixed"
		items[i].DiscountAmount = 0
		taxable += line
		tax += items[i].GSTAmount
	}
	bill := &models.Bill{
		InvoiceNumber: "INV-2026-0042",
		BillDate:      time.Now(),
		DueDate:       &due,
		Status:        "pending",
		Customer:      cust,
		Account:       acc,
		BillItems:     items,
		Subtotal:      taxable,
		TaxableAmount: taxable,
		CGSTAmount:    tax / 2,
		SGSTAmount:    tax / 2,
		TotalTax:      tax,
		TotalAmount:   taxable + tax,
		Notes:         "Goods once sold will not be taken back. Thank you for your business!",
	}
	return bill, biz
}
