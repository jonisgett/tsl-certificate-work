package main

import (
	"certificate-viewer/services"
	"fmt"
	"html/template"
	"net/http"
	"strings"
)

func main() {
	// Handle requests to the root path "/"
	http.HandleFunc("/", homeHandler)

	// Handle search requests
	http.HandleFunc("/search", searchHandler)

	// Start the server on port 8080
	fmt.Println("Server starting on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}

// homeHandler serves the homepage
func homeHandler(w http.ResponseWriter, r *http.Request) {
	// Only handle exact "/" path, not everything
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		http.Error(w, "Could not load page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, nil)
}

// SearchData holds data to pass to the results template
type SearchData struct {
	Domain       string
	Certificates []services.Certificate
	Error        string
}

// searchHandler handles certificate lookups
func searchHandler(w http.ResponseWriter, r *http.Request) {
	// Get the domain from the query string
	domain := strings.TrimSpace(r.URL.Query().Get("domain"))

	// Prepare data for the template
	data := SearchData{
		Domain: domain,
	}

	// Validate domain
	if domain == "" {
		data.Error = "Please enter a domain name"
	} else {
		// Fetch certificates
		certs, err := services.FetchCertificates(domain)
		if err != nil {
			data.Error = err.Error()
		} else {
			data.Certificates = certs
		}
	}

	// Parse and execute the results template
	tmpl, err := template.ParseFiles("templates/results.html")
	if err != nil {
		http.Error(w, "Could not load page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, data)
}
