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

## Core Features (MVP)

1. **Homepage** - Simple form where user enters a domain name
2. **Results page** - Displays certificates from the past 3 months including:
   - Certificate issuer
   - Validity dates (not before / not after)
   - Serial number
   - Subject Alternative Names (SANs)
   - CT log source
3. **Error handling** - Friendly messages for invalid domains or API failures

## Tech Stack

- **Backend**: Go (Golang)
- **Frontend**: HTML, CSS, vanilla JavaScript
- **Data Source**: crt.sh (free Certificate Transparency log search API)
- **Deployment**: VPS (Fly.io, Render, or similar) + Cloudflare proxy

## API Data Source

**crt.sh** - A free web interface to Certificate Transparency logs
- Website: https://crt.sh
- API endpoint: `https://crt.sh/?q=DOMAIN&output=json`
- No authentication required
- Returns JSON array of certificate records

## Project Structure (Planned)

```
tsl-certificates-work/
├── claude.md           # This file - project documentation
├── go.mod              # Go module definition
├── go.sum              # Go dependencies checksum
├── main.go             # Application entry point
├── handlers/           # HTTP request handlers
│   └── handlers.go
├── services/           # Business logic (CT log queries)
│   └── certificates.go
├── templates/          # HTML templates
│   ├── index.html      # Homepage with search form
│   └── results.html    # Certificate results display
└── static/             # Static assets
    ├── css/
    │   └── style.css
    └── js/
        └── main.js
```

## Development Phases

### Phase 1: Project Setup
- [ ] Initialize Go module
- [ ] Create basic project structure
- [ ] Set up a simple "Hello World" HTTP server
- [ ] Verify everything runs locally

### Phase 2: Backend Foundation
- [ ] Create homepage route serving HTML
- [ ] Build the crt.sh API client
- [ ] Parse certificate data from JSON response
- [ ] Filter certificates to last 3 months

### Phase 3: Frontend Development
- [ ] Design and build the homepage with search form
- [ ] Create results page template
- [ ] Style with CSS
- [ ] Add basic JavaScript for form handling

### Phase 4: Integration
- [ ] Connect form submission to backend
- [ ] Display certificate results dynamically
- [ ] Add error handling and loading states
- [ ] Test with various domains

### Phase 5: Deployment
- [ ] Choose and set up VPS (Fly.io recommended)
- [ ] Deploy Go application
- [ ] Configure Cloudflare as proxy
- [ ] Set up custom domain (optional)

## Useful Commands

```bash
# Initialize Go module (run once)
go mod init certificate-viewer

# Run the application locally
go run main.go

# Build for production
go build -o certificate-viewer

# Run tests
go test ./...
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

## Current Status

**Phase 1: Project Setup** - Starting now
