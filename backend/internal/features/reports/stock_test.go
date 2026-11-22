package reports

import (
	"testing"
	"time"
)

func TestCoverageWindow(t *testing.T) {
	// 22 November 2026 in Kampala: the window is August, September and October.
	start, end := coverageWindow(time.Date(2026, 11, 22, 8, 0, 0, 0, time.UTC))
	if start.Format(time.DateOnly) != "2026-08-01" || end.Format(time.DateOnly) != "2026-11-01" {
		t.Fatalf("window %s to %s", start, end)
	}
	// 31 December 21:30 UTC is already January in Kampala.
	start, _ = coverageWindow(time.Date(2026, 12, 31, 21, 30, 0, 0, time.UTC))
	if start.Format(time.DateOnly) != "2026-10-01" {
		t.Fatalf("new-year window starts %s", start)
	}
}

func TestCoverage(t *testing.T) {
	windowStart := time.Date(2026, 8, 1, 0, 0, 0, 0, Kampala)
	before := windowStart.AddDate(0, -1, 0)
	after := windowStart.AddDate(0, 0, 10)
	for name, tc := range map[string]struct {
		usable, issued int64
		reconciled     bool
		history        *time.Time
		status         string
		months         float64
	}{
		"available":          {usable: 450, issued: 900, reconciled: true, history: &before, status: "available", months: 1.5},
		"unreconciled":       {usable: 450, issued: 900, reconciled: false, history: &before, status: "unavailable_unreconciled"},
		"history too short":  {usable: 450, issued: 900, reconciled: true, history: &after, status: "unavailable_short_history"},
		"no history at all":  {usable: 450, issued: 0, reconciled: true, history: nil, status: "unavailable_short_history"},
		"nothing was issued": {usable: 450, issued: 0, reconciled: true, history: &before, status: "unavailable_no_issues"},
	} {
		monthly, months, status := coverage(tc.usable, tc.issued, tc.reconciled, tc.history, windowStart)
		if status != tc.status {
			t.Errorf("%s: status %s, want %s", name, status, tc.status)
			continue
		}
		if tc.status != "available" {
			if months != nil || monthly != nil {
				t.Errorf("%s: unavailable coverage must have no figures", name)
			}
			continue
		}
		if *monthly != 300 || *months != tc.months {
			t.Errorf("%s: %v a month, %v months; want 300 and %v", name, *monthly, *months, tc.months)
		}
	}
}
