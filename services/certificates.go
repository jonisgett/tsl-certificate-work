package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// Certificate represents a certificate record from crt.sh
type Certificate struct {
	IssuerName     string `json:"issuer_name"`
	CommonName     string `json:"common_name"`
	NameValue      string `json:"name_value"`
	NotBefore      string `json:"not_before"`
	NotAfter       string `json:"not_after"`
	SerialNumber   string `json:"serial_number"`
	EntryTimestamp string `json:"entry_timestamp"`
}

// FetchCertificates queries crt.sh for certificates matching the domain
func FetchCertificates(domain string) ([]Certificate, error) {
	// Build the API URL
	apiURL := fmt.Sprintf("https://crt.sh/?q=%s&output=json", url.QueryEscape(domain))

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 60 * time.Second,
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
