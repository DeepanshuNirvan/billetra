package utils

import (
	"fmt"
)

// GenerateInvoiceNumber creates an invoice number in the format PREFIX-YYYY-NNNN
func GenerateInvoiceNumber(prefix string, counter int) string {
	return fmt.Sprintf("%s/%04d", prefix, counter)
}
