# Certificate Transparency Log Viewer

## Project Overview

A web application that allows users to search for SSL/TLS certificates issued for a domain by querying Certificate Transparency (CT) logs. This is a learning project to build foundational knowledge for a future certificate fraud detection product.

**Live Site:** https://certs.jonisgett.dev

## Learning Goals

1. **Go backend development** - HTTP servers, routing, API design, data processing
2. **TypeScript/Cloudflare Workers** - Serverless edge computing, modern JavaScript
3. **Web design** - HTML, CSS, JavaScript fundamentals
4. **Certificate Transparency** - Understanding CT logs, certificate structures, and security implications
5. **Cloud hosting** - Deploying applications to Cloudflare Workers

## Architecture

**Cloudflare Workers (Current - Live)**

```
┌─────────────────┐      ┌─────────────────────────────────────┐
│   User's        │      │   Cloudflare Edge Network           │
│   Browser       │─────▶│   (300+ locations worldwide)        │
│                 │      │                                     │
└─────────────────┘      │   TypeScript Worker                 │
                         │   - Handles HTTP requests           │
                         │   - Fetches from crt.sh             │
                         │   - Returns HTML responses          │
                         └─────────────────────────────────────┘
```

**Go Version (Local Development)**

```
┌─────────────────┐      ┌─────────────────┐
│   User's        │      │   localhost:8080│
│   Browser       │─────▶│                 │
│                 │      │   Go Server     │
└─────────────────┘      └─────────────────┘
```

## Current Features (Implemented)

1. **Homepage** - Search form with loading spinner and status message
2. **Results page** - Displays certificates grouped by:
   - **Issuer** (e.g., "Let's Encrypt (R3)") - collapsible sections
   - **Certificate** - sorted by expiration date (newest first)
   - **CT Log Entries** - labeled as "Precertificate" or "Leaf Certificate"
3. **Date filter** - Filter certificates by "issued after" date
4. **Error handling** - Friendly messages for invalid domains or API failures
5. **UI Features**:
   - Collapsible issuer sections (click to expand/collapse)
   - "Expand All" / "Collapse All" buttons
   - Loading spinner during search
   - Responsive design

## Tech Stack

### Production (Cloudflare Workers)
- **Runtime**: Cloudflare Workers (TypeScript)
- **Framework**: None (vanilla TypeScript)
- **Deployment**: Wrangler CLI
- **Domain**: certs.jonisgett.dev

### Development (Go)
- **Backend**: Go (Golang) 1.23.4
- **Frontend**: HTML, CSS, vanilla JavaScript
- **Templates**: Go html/template

### Shared
- **Data Source**: crt.sh (free Certificate Transparency log search API)

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
├── claude.md                    # This file - project documentation
├── .gitignore                   # Git ignore rules
│
├── # Go Version (local development)
├── go.mod                       # Go module definition
├── main.go                      # Go HTTP handlers
├── services/
│   └── certificates.go          # Go certificate fetching & grouping
├── templates/
│   ├── index.html               # Go homepage template
│   └── results.html             # Go results template
│
└── workers/                     # TypeScript Version (LIVE at certs.jonisgett.dev)
    ├── src/
    │   ├── index.ts             # HTTP request routing
    │   ├── certificates.ts      # Certificate fetching & grouping
    │   └── templates.ts         # HTML template functions
    ├── wrangler.jsonc           # Cloudflare Workers config
    ├── package.json             # Node.js dependencies
    └── tsconfig.json            # TypeScript config
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

### TypeScript Concepts
- **Interfaces** - Type definitions (`interface Certificate { }`)
- **async/await** - Asynchronous programming
- **Modules** - ES6 imports/exports
- **Map** - JavaScript Map for grouping (`new Map<string, T>()`)
- **Array methods** - `.map()`, `.filter()`, `.sort()`, `.forEach()`
- **Template literals** - Multiline strings with `${variable}` interpolation

### Cloudflare Workers Concepts
- **Edge computing** - Code runs in 300+ data centers worldwide
- **fetch handler** - Entry point for all HTTP requests
- **Response object** - Creating HTTP responses
- **Wrangler** - CLI tool for development and deployment
- **Custom domains** - Routing traffic to Workers

### Web Concepts
- **HTML templates** - Go's template syntax vs TypeScript template literals
- **CSS** - Flexbox, Grid, styling
- **JavaScript** - DOM manipulation, event handling
- **Form submission** - GET requests with query parameters
- **XSS prevention** - HTML escaping in both Go and TypeScript

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

### Phase 5: Deployment - COMPLETE
- [x] Create Cloudflare Workers project
- [x] Port Go code to TypeScript
- [x] Configure custom domain (certs.jonisgett.dev)
- [x] Deploy to Cloudflare Workers

## Useful Commands

### Go (Local Development)
```bash
# Run the Go application locally
go run main.go

# Build for production
go build -o certificate-viewer
```

### Cloudflare Workers
```bash
# Navigate to workers directory
cd workers

# Start local dev server
npx wrangler dev

# Deploy to production
export CLOUDFLARE_API_TOKEN="your-token"
npx wrangler deploy

# View live logs
npx wrangler tail
```

### Git
```bash
git add . && git commit -m "message"
git push origin main
```

## Resources

- [Go Documentation](https://go.dev/doc/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Certificate Transparency Overview](https://certificate.transparency.dev/)
- [crt.sh](https://crt.sh/)

## Notes

- TLS = Transport Layer Security (successor to SSL)
- CT = Certificate Transparency
- CT logs are append-only public logs of all issued certificates
- Certificates must be logged to be trusted by browsers (since 2018)
- crt.sh can be slow for large domains - consider adding pagination in future

## Future Improvements

- [ ] Add pagination for large result sets
- [ ] Strip "www." from domain input automatically
- [ ] Add ability to view full certificate details
- [ ] Export results to CSV/JSON
- [ ] Add fraud detection indicators (for friend's project)
- [ ] Add caching with Cloudflare KV storage

## Current Status

**All Phases Complete** - Application is live at https://certs.jonisgett.dev
