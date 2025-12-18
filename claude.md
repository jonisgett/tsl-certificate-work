# Certificate Transparency Log Viewer

## Project Overview

A web application that allows users to search for SSL/TLS certificates issued for a domain by querying Certificate Transparency (CT) logs. This is a learning project to build foundational knowledge for a future certificate fraud detection product.

## Learning Goals

1. **Go backend development** - HTTP servers, routing, API design, data processing
2. **Web design** - HTML, CSS, JavaScript fundamentals
3. **Certificate Transparency** - Understanding CT logs, certificate structures, and security implications
4. **Cloud hosting** - Deploying applications to a VPS with Cloudflare as a proxy

## Architecture

**Single Server Architecture (Option B)**

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   User's        │      │   Cloudflare    │      │   VPS           │
│   Browser       │─────▶│   (proxy/CDN)   │─────▶│                 │
│                 │      │                 │      │   Go Server     │
└─────────────────┘      └─────────────────┘      │   (serves both  │
                                                  │   HTML + API)   │
                                                  └─────────────────┘
```

- One Go server handles everything: serves HTML pages AND processes certificate lookups
- Cloudflare sits in front for security/caching (added later during deployment)
- Development happens locally first, deployment to VPS later

## Current Features (Implemented)

1. **Homepage** - Search form with loading spinner and status message
2. **Results page** - Displays certificates grouped by:
   - **Issuer** (e.g., "Let's Encrypt (R3)") - collapsible sections
   - **Certificate** - sorted by expiration date (newest first)
   - **CT Log Entries** - labeled as "Precertificate" or "Leaf Certificate"
3. **Error handling** - Friendly messages for invalid domains or API failures
4. **UI Features**:
   - Collapsible issuer sections (click to expand/collapse)
   - "Expand All" / "Collapse All" buttons
   - Loading spinner during search
   - Responsive design

## Tech Stack

- **Backend**: Go (Golang) 1.23.4
- **Frontend**: HTML, CSS, vanilla JavaScript
- **Data Source**: crt.sh (free Certificate Transparency log search API)
- **Deployment**: VPS (Fly.io, Render, or similar) + Cloudflare proxy (pending)

## API Data Source

**crt.sh** - A free web interface to Certificate Transparency logs
- Website: https://crt.sh
- API endpoint: `https://crt.sh/?q=DOMAIN&output=json`
- No authentication required
- Returns JSON array of certificate records
- Note: Can be slow (timeout set to 120 seconds)

## Project Structure

```
tsl-certificates-work/
├── claude.md              # This file - project documentation
├── .gitignore             # Git ignore rules
├── go.mod                 # Go module definition
├── main.go                # Application entry point & HTTP handlers
├── handlers/              # (empty - handlers in main.go for now)
├── services/
│   └── certificates.go    # Certificate fetching, grouping, and labeling
├── templates/
│   ├── index.html         # Homepage with search form
│   └── results.html       # Certificate results display
└── static/                # (empty - CSS/JS inline for now)
    ├── css/
    └── js/
```

## Key Concepts Learned

### Go Concepts
- **Packages** - Organizing code (`package main`, `package services`)
- **Modules** - Dependency management (`go.mod`)
- **Structs** - Data structures with JSON tags
- **Maps** - For grouping data (`map[string]*CertificateGroup`)
- **Slices** - Dynamic arrays
- **Error handling** - Returning `(result, error)` tuples
- **HTTP server** - `http.HandleFunc`, `http.ListenAndServe`
- **Templates** - `html/template` for safe HTML rendering

### Web Concepts
- **HTML templates** - Go's template syntax (`{{.Field}}`, `{{range}}`, `{{if}}`)
- **CSS** - Flexbox, Grid, styling
- **JavaScript** - DOM manipulation, event handling
- **Form submission** - GET requests with query parameters
- **XSS prevention** - Using `html/template` for automatic escaping

### Certificate Transparency Concepts
- **Precertificate vs Leaf Certificate** - Precerts are logged before final issuance
- **Serial Number** - Unique identifier that links precert and leaf cert
- **Issuer** - Certificate Authority that issued the cert (e.g., Let's Encrypt)
- **Validity Period** - NotBefore and NotAfter dates
- **Subject Alternative Names (SANs)** - Domains covered by the cert

## Development Phases

### Phase 1: Project Setup - COMPLETE
- [x] Initialize Go module
- [x] Create basic project structure
- [x] Set up a simple "Hello World" HTTP server
- [x] Verify everything runs locally

### Phase 2: Backend Foundation - COMPLETE
- [x] Create homepage route serving HTML
- [x] Build the crt.sh API client
- [x] Parse certificate data from JSON response
- [x] Group certificates by serial number
- [x] Group certificates by issuer
- [x] Label precertificates vs leaf certificates
- [x] Sort by expiration date

### Phase 3: Frontend Development - COMPLETE
- [x] Design and build the homepage with search form
- [x] Create results page template
- [x] Style with CSS
- [x] Add collapsible sections
- [x] Add loading spinner

### Phase 4: Integration - COMPLETE
- [x] Connect form submission to backend
- [x] Display certificate results dynamically
- [x] Add error handling and loading states
- [x] Test with various domains

### Phase 5: Deployment - PENDING
- [ ] Choose and set up VPS (Fly.io recommended)
- [ ] Deploy Go application
- [ ] Configure Cloudflare as proxy
- [ ] Set up custom domain (optional)

## Useful Commands

```bash
# Run the application locally
go run main.go

# Build for production
go build -o certificate-viewer

# Run tests
go test ./...

# Git commands
git add . && git commit -m "message"
git push origin main
```

## Resources

- [Go Documentation](https://go.dev/doc/)
- [Certificate Transparency Overview](https://certificate.transparency.dev/)
- [crt.sh](https://crt.sh/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Fly.io Go Guide](https://fly.io/docs/languages-and-frameworks/golang/)

## Notes

- TLS = Transport Layer Security (successor to SSL)
- CT = Certificate Transparency
- CT logs are append-only public logs of all issued certificates
- Certificates must be logged to be trusted by browsers (since 2018)
- crt.sh can be slow for large domains - consider adding pagination in future

## Future Improvements

- [ ] Add date range filter (e.g., last 3 months only)
- [ ] Add pagination for large result sets
- [ ] Strip "www." from domain input automatically
- [ ] Add ability to view full certificate details
- [ ] Export results to CSV/JSON
- [ ] Add fraud detection indicators (for friend's project)

## Current Status

**Phases 1-4 Complete** - Working local application with full feature set. Ready for deployment (Phase 5).
