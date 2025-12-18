package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// Certificate represents a certificate record from crt.sh
type Certificate struct {
	ID             int64  `json:"id"`
	IssuerCAID     int64  `json:"issuer_ca_id"`
	IssuerName     string `json:"issuer_name"`
	CommonName     string `json:"common_name"`
	NameValue      string `json:"name_value"`
	NotBefore      string `json:"not_before"`
	NotAfter       string `json:"not_after"`
	SerialNumber   string `json:"serial_number"`
	EntryTimestamp string `json:"entry_timestamp"`
	EntryType      string // "Precertificate" or "Leaf Certificate" - we set this
}

// CertificateGroup holds certificates that share the same serial number
// (typically a precertificate and its corresponding leaf certificate)
type CertificateGroup struct {
	SerialNumber string
	CommonName   string
	IssuerName   string
	NotBefore    string
	NotAfter     string
	NotAfterTime time.Time // Parsed time for sorting
	Entries      []Certificate
}

// IssuerGroup holds all certificate groups from the same issuer
type IssuerGroup struct {
	IssuerName   string
	DisplayName  string // Shortened/cleaned name for display
	Certificates []CertificateGroup
}

// FetchCertificates queries crt.sh for certificates matching the domain
func FetchCertificates(domain string) ([]Certificate, error) {
	// Build the API URL
	apiURL := fmt.Sprintf("https://crt.sh/?q=%s&output=json", url.QueryEscape(domain))

	// Create HTTP client with timeout (crt.sh can be slow)
	client := &http.Client{
		Timeout: 120 * time.Second,
	}

	// Make the request
	resp, err := client.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch certificates: %w", err)
	}
	defer resp.Body.Close()

	// Check for non-200 status
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("crt.sh returned status: %d", resp.StatusCode)
	}

	// Parse JSON response
	var certs []Certificate
	if err := json.NewDecoder(resp.Body).Decode(&certs); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return certs, nil
}

// FilterByNotBefore filters certificates to only include those issued on or after the given date
func FilterByNotBefore(certs []Certificate, notBeforeDate string) []Certificate {
	// Parse the filter date (format: 2006-01-02 from HTML date input)
	filterDate, err := time.Parse("2006-01-02", notBeforeDate)
	if err != nil {
		// If date parsing fails, return all certificates
		return certs
	}

	filtered := make([]Certificate, 0)
	for _, cert := range certs {
		// Parse the certificate's NotBefore date
		certDate, err := time.Parse("2006-01-02T15:04:05", cert.NotBefore)
		if err != nil {
			// If we can't parse the cert date, include it anyway
			filtered = append(filtered, cert)
			continue
		}

		// Include certificate if it was issued on or after the filter date
		if !certDate.Before(filterDate) {
			filtered = append(filtered, cert)
		}
	}

	return filtered
}

// GroupCertificates groups certificates by their serial number
func GroupCertificates(certs []Certificate) []CertificateGroup {
	// Map to collect certificates by serial number
	groupMap := make(map[string]*CertificateGroup)

	for _, cert := range certs {
		// Check if we already have a group for this serial number
		if group, exists := groupMap[cert.SerialNumber]; exists {
			// Add to existing group
			group.Entries = append(group.Entries, cert)
		} else {
			// Parse the NotAfter date for sorting
			notAfterTime, _ := time.Parse("2006-01-02T15:04:05", cert.NotAfter)

			// Create new group
			groupMap[cert.SerialNumber] = &CertificateGroup{
				SerialNumber: cert.SerialNumber,
				CommonName:   cert.CommonName,
				IssuerName:   cert.IssuerName,
				NotBefore:    cert.NotBefore,
				NotAfter:     cert.NotAfter,
				NotAfterTime: notAfterTime,
				Entries:      []Certificate{cert},
			}
		}
	}

	// Convert map to slice and label entries
	groups := make([]CertificateGroup, 0, len(groupMap))
	for _, group := range groupMap {
		labelEntries(group)
		groups = append(groups, *group)
	}

	return groups
}

// GroupByIssuer groups certificate groups by their issuer
func GroupByIssuer(groups []CertificateGroup) []IssuerGroup {
	// Map to collect groups by issuer
	issuerMap := make(map[string]*IssuerGroup)

	for _, group := range groups {
		if issuer, exists := issuerMap[group.IssuerName]; exists {
			issuer.Certificates = append(issuer.Certificates, group)
		} else {
			issuerMap[group.IssuerName] = &IssuerGroup{
				IssuerName:   group.IssuerName,
				DisplayName:  extractIssuerDisplayName(group.IssuerName),
				Certificates: []CertificateGroup{group},
			}
		}
	}

	// Convert map to slice
	issuers := make([]IssuerGroup, 0, len(issuerMap))
	for _, issuer := range issuerMap {
		// Sort certificates within each issuer by NotAfter date (newest first)
		sort.Slice(issuer.Certificates, func(i, j int) bool {
			return issuer.Certificates[i].NotAfterTime.After(issuer.Certificates[j].NotAfterTime)
		})
		issuers = append(issuers, *issuer)
	}

	// Sort issuers alphabetically by display name
	sort.Slice(issuers, func(i, j int) bool {
		return issuers[i].DisplayName < issuers[j].DisplayName
	})

	return issuers
}

// extractIssuerDisplayName pulls out a friendly name from the full issuer string
// e.g., "C=US, O=Let's Encrypt, CN=R3" -> "Let's Encrypt (R3)"
func extractIssuerDisplayName(issuerName string) string {
	var org, cn string

	parts := strings.Split(issuerName, ", ")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "O=") {
			org = strings.TrimPrefix(part, "O=")
		} else if strings.HasPrefix(part, "CN=") {
			cn = strings.TrimPrefix(part, "CN=")
		}
	}

	if org != "" && cn != "" {
		return fmt.Sprintf("%s (%s)", org, cn)
	} else if org != "" {
		return org
	} else if cn != "" {
		return cn
	}

	return issuerName
}

// labelEntries marks entries as Precertificate or Leaf Certificate
// The entry with the earlier timestamp is the precertificate
func labelEntries(group *CertificateGroup) {
	if len(group.Entries) == 1 {
		// Only one entry - we can't be sure, label as Leaf Certificate
		group.Entries[0].EntryType = "Leaf Certificate"
		return
	}

	// Sort entries by ID (lower ID = logged first = precertificate)
	sort.Slice(group.Entries, func(i, j int) bool {
		return group.Entries[i].ID < group.Entries[j].ID
	})

	// Label them
	for i := range group.Entries {
		if i == 0 {
			group.Entries[i].EntryType = "Precertificate"
		} else {
			group.Entries[i].EntryType = "Leaf Certificate"
		}
	}
}
