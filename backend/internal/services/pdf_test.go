package services

import (
	"os"
	"testing"
)

func TestGenerateAllTemplates(t *testing.T) {
	svc := NewPDFService()
	bill, biz := SampleBill()
	out := t.TempDir()
	for _, tpl := range Templates {
		bill.Template = tpl.Value
		data, err := svc.GenerateBillPDF(bill, biz)
		if err != nil {
			t.Fatalf("template %s: %v", tpl.Value, err)
		}
		if len(data) < 800 {
			t.Fatalf("template %s: pdf too small (%d bytes)", tpl.Value, len(data))
		}
		_ = os.WriteFile(out+"/"+tpl.Value+".pdf", data, 0644)
	}

	// interstate variant
	bill.IsInterstate = true
	bill.IGSTAmount = bill.TotalTax
	bill.CGSTAmount = 0
	bill.SGSTAmount = 0
	bill.Template = "classic_gst"
	if _, err := svc.GenerateBillPDF(bill, biz); err != nil {
		t.Fatalf("interstate classic_gst: %v", err)
	}
}

func TestRupeesInWords(t *testing.T) {
	cases := map[float64]string{
		0:          "Zero Rupees Only",
		1234567.5:  "Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Fifty Paise Only",
		100:        "Rupees One Hundred Only",
		10000000:   "Rupees One Crore Only",
	}
	for in, want := range cases {
		if got := rupeesInWords(in); got != want {
			t.Errorf("rupeesInWords(%v) = %q, want %q", in, got, want)
		}
	}
}

func TestIndianMoney(t *testing.T) {
	cases := map[float64]string{
		1234567.5: "12,34,567.50",
		1000:      "1,000.00",
		999:       "999.00",
		100000:    "1,00,000.00",
	}
	for in, want := range cases {
		if got := indianMoney(in); got != want {
			t.Errorf("indianMoney(%v) = %q, want %q", in, got, want)
		}
	}
}
