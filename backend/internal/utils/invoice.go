package utils

import (
	"fmt"
	"time"
)

// GenerateInvoiceNumber creates an invoice number in the format PREFIX-YYYY-NNNN
func GenerateInvoiceNumber(prefix string, counter int) string {
	year := time.Now().Year()
	return fmt.Sprintf("%s-%d-%04d", prefix, year, counter)
}
