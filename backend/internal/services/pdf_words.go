package services

import (
	"fmt"
	"math"
	"strings"
)

var onesWords = []string{
	"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
	"Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
	"Seventeen", "Eighteen", "Nineteen",
}
var tensWords = []string{
	"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
}

// twoDigits converts 0-99 to words.
func twoDigits(n int) string {
	if n < 20 {
		return onesWords[n]
	}
	w := tensWords[n/10]
	if n%10 != 0 {
		w += " " + onesWords[n%10]
	}
	return w
}

// threeDigits converts 0-999 to words ("hundred" group).
func threeDigits(n int) string {
	var parts []string
	if n >= 100 {
		parts = append(parts, onesWords[n/100]+" Hundred")
		n %= 100
	}
	if n > 0 {
		parts = append(parts, twoDigits(n))
	}
	return strings.Join(parts, " ")
}

// rupeesInWords renders an amount using the Indian numbering system.
func rupeesInWords(amount float64) string {
	if amount < 0 {
		return "Minus " + rupeesInWords(-amount)
	}
	rupees := int64(math.Floor(amount + 1e-9))
	paise := int64(math.Round((amount - float64(rupees)) * 100))
	if paise == 100 {
		rupees++
		paise = 0
	}

	if rupees == 0 && paise == 0 {
		return "Zero Rupees Only"
	}

	var groups []string
	crore := rupees / 10000000
	rupees %= 10000000
	lakh := rupees / 100000
	rupees %= 100000
	thousand := rupees / 1000
	rupees %= 1000
	hundreds := rupees

	if crore > 0 {
		groups = append(groups, threeDigits(int(crore))+" Crore")
	}
	if lakh > 0 {
		groups = append(groups, twoDigits(int(lakh))+" Lakh")
	}
	if thousand > 0 {
		groups = append(groups, twoDigits(int(thousand))+" Thousand")
	}
	if hundreds > 0 {
		groups = append(groups, threeDigits(int(hundreds)))
	}

	words := strings.TrimSpace(strings.Join(groups, " "))
	out := "Rupees " + words
	if paise > 0 {
		out += fmt.Sprintf(" and %s Paise", twoDigits(int(paise)))
	}
	out += " Only"
	return out
}
