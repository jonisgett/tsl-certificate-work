import { IssuerGroup, CTSentryIssuerGroup, CTSentryCertGroup, CTSentryCertRecord } from './certificates';

// Homepage HTML - the search form
export function renderHomepage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate Transparency Viewer</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin-bottom: 30px;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .search-row {
            display: flex;
            gap: 10px;
        }
        .date-row {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #666;
        }
        .date-row label {
            white-space: nowrap;
        }
        .date-row input[type="date"] {
            padding: 8px 12px;
            font-size: 14px;
            border: 2px solid #ddd;
            border-radius: 4px;
            outline: none;
        }
        .date-row input[type="date"]:focus {
            border-color: #007bff;
        }
        input[type="text"] {
            flex: 1;
            padding: 12px 16px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 4px;
            outline: none;
        }
        input[type="text"]:focus {
            border-color: #007bff;
        }
        button {
            padding: 12px 24px;
            font-size: 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        .spinner {
            display: none;
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loading-message {
            display: none;
            margin-top: 20px;
            padding: 15px;
            background: #e7f3ff;
            border-radius: 4px;
            color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Certificate Transparency Viewer</h1>
        <p>Enter a domain to view its SSL/TLS certificates</p>
        <form action="/search" method="GET" onsubmit="showLoading()">
            <div class="search-row">
                <input type="text" name="domain" placeholder="example.com" required id="domainInput">
                <button type="submit" id="searchBtn">
                    <span class="spinner" id="spinner"></span>
                    <span id="btnText">Search</span>
                </button>
            </div>
            <div class="date-row">
                <label for="notBefore">Only show certificates issued after:</label>
                <input type="date" name="notBefore" id="notBefore">
            </div>
        </form>
        <div class="loading-message" id="loadingMessage">
            Searching certificate transparency logs... This may take up to 2 minutes for some domains.
        </div>
    </div>

    <script>
        function showLoading() {
            document.getElementById('spinner').style.display = 'block';
            document.getElementById('btnText').textContent = 'Searching...';
            document.getElementById('loadingMessage').style.display = 'block';
            setTimeout(function() {
                document.getElementById('searchBtn').disabled = true;
                document.getElementById('domainInput').disabled = true;
            }, 10);
        }

        // Reset form state when navigating back (bfcache restore)
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('btnText').textContent = 'Search';
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('searchBtn').disabled = false;
                document.getElementById('domainInput').disabled = false;
            }
        });
    </script>
</body>
</html>`;
}

// Results page HTML
export function renderResults(
  domain: string,
  issuers: IssuerGroup[],
  totalCerts: number,
  error?: string
): string {
  // Build the error HTML if there's an error
  if (error) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Results for ${escapeHtml(domain)}</title>
    <style>${getResultsStyles()}</style>
</head>
<body>
    <div class="header">
        <a href="/" class="back-link">← Back to search</a>
        <h1>Certificates for ${escapeHtml(domain)}</h1>
    </div>
    <div class="error">
        <strong>Error:</strong> ${escapeHtml(error)}
    </div>
</body>
</html>`;
  }

  // Build the results HTML
  let certificatesHtml = '';
  
  if (issuers.length === 0) {
    certificatesHtml = '<div class="no-results">No certificates found for this domain.</div>';
  } else {
    certificatesHtml = `
    <div class="controls">
        <button onclick="expandAll()">Expand All</button>
        <button onclick="collapseAll()">Collapse All</button>
    </div>
    <div class="results">
        ${issuers.map(issuer => renderIssuerSection(issuer)).join('')}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Results for ${escapeHtml(domain)}</title>
    <style>${getResultsStyles()}</style>
</head>
<body>
    <div class="header">
        <a href="/" class="back-link">← Back to search</a>
        <h1>Certificates for ${escapeHtml(domain)}</h1>
        <p>Found ${totalCerts} unique certificate(s) from ${issuers.length} issuer(s)</p>
    </div>
    ${certificatesHtml}
    <script>
        function toggleSection(header) {
            const section = header.closest('.issuer-section');
            section.classList.toggle('collapsed');
        }
        function expandAll() {
            document.querySelectorAll('.issuer-section').forEach(section => {
                section.classList.remove('collapsed');
            });
        }
        function collapseAll() {
            document.querySelectorAll('.issuer-section').forEach(section => {
                section.classList.add('collapsed');
            });
        }
    </script>
</body>
</html>`;
}

// Render a single issuer section
function renderIssuerSection(issuer: IssuerGroup): string {
  return `
    <div class="issuer-section">
        <div class="issuer-header" onclick="toggleSection(this)">
            <h2><span class="toggle-icon">▼</span> ${escapeHtml(issuer.displayName)}</h2>
            <span class="issuer-cert-count">${issuer.certificates.length} certificate(s)</span>
        </div>
        <div class="issuer-certs">
            ${issuer.certificates.map(cert => renderCertificateGroup(cert)).join('')}
        </div>
    </div>`;
}

// Render a single certificate group
function renderCertificateGroup(group: { 
  commonName: string; 
  notBefore: string; 
  notAfter: string; 
  serialNumber: string; 
  entries: { entry_type?: string; id: number; entry_timestamp: string; name_value: string }[] 
}): string {
  return `
    <div class="cert-group">
        <div class="group-header">
            <h3>${escapeHtml(group.commonName)}</h3>
        </div>
        <div class="group-info">
            <div class="group-info-grid">
                <div class="info-item">
                    <span class="info-label">Valid From</span>
                    <span class="info-value">${escapeHtml(group.notBefore)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Valid Until</span>
                    <span class="info-value">${escapeHtml(group.notAfter)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Serial Number</span>
                    <span class="info-value">${escapeHtml(group.serialNumber)}</span>
                </div>
            </div>
        </div>
        <div class="entries-section">
            <div class="entries-title">
                CT Log Entries<span class="entry-count">${group.entries.length}</span>
            </div>
            ${group.entries.map(entry => renderEntry(entry)).join('')}
        </div>
    </div>`;
}

// Render a single CT log entry
function renderEntry(entry: { entry_type?: string; id: number; entry_timestamp: string; name_value: string }): string {
  const isPrecert = entry.entry_type === 'Precertificate';
  return `
    <div class="entry">
        <div class="entry-header">
            <span class="entry-type ${isPrecert ? 'precert' : 'leaf'}">${isPrecert ? 'Precertificate' : 'Leaf Certificate'}</span>
            <span class="entry-field">
                <span class="label">ID:</span>
                <span class="value">${entry.id}</span>
            </span>
        </div>
        <div class="entry-row">
            <div class="entry-field">
                <span class="label">Logged:</span>
                <span class="value">${escapeHtml(entry.entry_timestamp)}</span>
            </div>
            <div class="entry-field">
                <span class="label">Names:</span>
                <span class="value">${escapeHtml(entry.name_value)}</span>
            </div>
        </div>
    </div>`;
}

// Escape HTML to prevent XSS attacks
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// CSS styles for the results page
function getResultsStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .header { max-width: 1000px; margin: 0 auto 20px; }
    .header h1 { color: #333; margin-bottom: 5px; }
    .header p { color: #666; }
    .back-link { display: inline-block; margin-bottom: 15px; color: #007bff; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .controls { max-width: 1000px; margin: 0 auto 15px; }
    .controls button { background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 10px; }
    .controls button:hover { background: #5a6268; }
    .results { max-width: 1000px; margin: 0 auto; }
    .issuer-section { margin-bottom: 30px; }
    .issuer-header { background: #2c3e50; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
    .issuer-header:hover { background: #34495e; }
    .issuer-section.collapsed .issuer-header { border-radius: 8px; }
    .issuer-header h2 { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .toggle-icon { font-size: 12px; transition: transform 0.2s; }
    .issuer-section.collapsed .toggle-icon { transform: rotate(-90deg); }
    .issuer-cert-count { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 14px; }
    .issuer-certs { background: #e9ecef; padding: 15px; border-radius: 0 0 8px 8px; overflow: hidden; transition: max-height 0.3s ease-out, padding 0.3s ease-out; }
    .issuer-section.collapsed .issuer-certs { max-height: 0; padding: 0 15px; }
    .cert-group { background: white; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); overflow: hidden; }
    .cert-group:last-child { margin-bottom: 0; }
    .group-header { background: #007bff; color: white; padding: 12px 20px; }
    .group-header h3 { font-size: 16px; margin-bottom: 0; word-break: break-all; }
    .group-info { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; }
    .group-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
    .info-value { color: #333; word-break: break-all; font-size: 14px; }
    .entries-section { padding: 15px 20px; }
    .entries-title { font-size: 14px; color: #666; margin-bottom: 10px; }
    .entry-count { background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px; }
    .entry { background: #f8f9fa; border-radius: 4px; padding: 12px; margin-bottom: 8px; }
    .entry:last-child { margin-bottom: 0; }
    .entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .entry-type { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 4px; }
    .entry-type.precert { background: #fff3cd; color: #856404; }
    .entry-type.leaf { background: #d4edda; color: #155724; }
    .entry-row { display: flex; flex-wrap: wrap; gap: 15px; }
    .entry-field { font-size: 13px; }
    .entry-field .label { color: #666; }
    .entry-field .value { color: #333; font-family: monospace; }
    .no-results { background: white; padding: 40px; text-align: center; border-radius: 8px; color: #666; }
    .error { background: #fee; border: 1px solid #fcc; color: #c00; padding: 20px; border-radius: 8px; max-width: 1000px; margin: 0 auto; }
    .truncation-warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px 20px; border-radius: 8px; max-width: 1000px; margin: 0 auto 20px; }
    .key-info { display: inline-flex; align-items: center; gap: 5px; background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .dns-names { display: flex; flex-wrap: wrap; gap: 5px; }
    .dns-name { background: #e7f3ff; padding: 2px 8px; border-radius: 4px; font-size: 13px; color: #0056b3; }
  `;
}

// =============================================================================
// CTSentry Template Functions (NEW)
// =============================================================================

// Main results page for CTSentry data
export function renderCTSentryResults(
  domain: string,
  issuers: CTSentryIssuerGroup[],
  totalCerts: number,
  truncated: boolean = false,
  error?: string
): string {
  // Build the error HTML if there's an error
  if (error) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Results for ${escapeHtml(domain)}</title>
    <style>${getResultsStyles()}</style>
</head>
<body>
    <div class="header">
        <a href="/" class="back-link">← Back to search</a>
        <h1>Certificates for ${escapeHtml(domain)}</h1>
    </div>
    <div class="error">
        <strong>Error:</strong> ${escapeHtml(error)}
    </div>
</body>
</html>`;
  }

  // Build the truncation warning if results were cut off
  const truncationWarning = truncated
    ? `<div class="truncation-warning">
        <strong>Note:</strong> Results were limited to 9,999 entries. There may be more certificates for this domain.
       </div>`
    : '';

  // Build the results HTML
  let certificatesHtml = '';

  if (issuers.length === 0) {
    certificatesHtml = '<div class="no-results">No certificates found for this domain.</div>';
  } else {
    certificatesHtml = `
    <div class="controls">
        <button onclick="expandAll()">Expand All</button>
        <button onclick="collapseAll()">Collapse All</button>
    </div>
    <div class="results">
        ${issuers.map(issuer => renderCTSentryIssuerSection(issuer)).join('')}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Results for ${escapeHtml(domain)}</title>
    <style>${getResultsStyles()}</style>
</head>
<body>
    <div class="header">
        <a href="/" class="back-link">← Back to search</a>
        <h1>Certificates for ${escapeHtml(domain)}</h1>
        <p>Found ${totalCerts} unique certificate(s) from ${issuers.length} issuer(s)</p>
    </div>
    ${truncationWarning}
    ${certificatesHtml}
    <script>
        function toggleSection(header) {
            const section = header.closest('.issuer-section');
            section.classList.toggle('collapsed');
        }
        function expandAll() {
            document.querySelectorAll('.issuer-section').forEach(section => {
                section.classList.remove('collapsed');
            });
        }
        function collapseAll() {
            document.querySelectorAll('.issuer-section').forEach(section => {
                section.classList.add('collapsed');
            });
        }
    </script>
</body>
</html>`;
}

// Render a single issuer section for CTSentry data
function renderCTSentryIssuerSection(issuer: CTSentryIssuerGroup): string {
  return `
    <div class="issuer-section">
        <div class="issuer-header" onclick="toggleSection(this)">
            <h2><span class="toggle-icon">▼</span> ${escapeHtml(issuer.displayName)}</h2>
            <span class="issuer-cert-count">${issuer.certificates.length} certificate(s)</span>
        </div>
        <div class="issuer-certs">
            ${issuer.certificates.map(cert => renderCTSentryCertGroup(cert)).join('')}
        </div>
    </div>`;
}

// Render a single certificate group for CTSentry data
function renderCTSentryCertGroup(group: CTSentryCertGroup): string {
  const cert = group.primaryCert.cert!;

  // Format the public key info nicely
  const keyInfo = cert.public_key
    ? `${cert.public_key.algorithm || 'Unknown'} ${cert.public_key.size_bits || '?'}-bit`
    : 'Unknown';

  // Format validity dates nicely
  const notBefore = formatDate(group.notBefore);
  const notAfter = formatDate(group.notAfter);

  // Format DNS names as tags
  const dnsNamesHtml = group.dnsNames.length > 0
    ? `<div class="dns-names">
        ${group.dnsNames.slice(0, 5).map(name => `<span class="dns-name">${escapeHtml(name)}</span>`).join('')}
        ${group.dnsNames.length > 5 ? `<span class="dns-name">+${group.dnsNames.length - 5} more</span>` : ''}
       </div>`
    : '<span class="info-value">None</span>';

  return `
    <div class="cert-group">
        <div class="group-header">
            <h3>${escapeHtml(group.commonName)}</h3>
        </div>
        <div class="group-info">
            <div class="group-info-grid">
                <div class="info-item">
                    <span class="info-label">Valid From</span>
                    <span class="info-value">${escapeHtml(notBefore)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Valid Until</span>
                    <span class="info-value">${escapeHtml(notAfter)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Public Key</span>
                    <span class="key-info">${escapeHtml(keyInfo)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Serial Number</span>
                    <span class="info-value">${escapeHtml(cert.serial_number || 'Unknown')}</span>
                </div>
            </div>
            <div class="info-item" style="margin-top: 15px;">
                <span class="info-label">DNS Names</span>
                ${dnsNamesHtml}
            </div>
        </div>
        <div class="entries-section">
            <div class="entries-title">
                CT Log Entries<span class="entry-count">${group.allEntries.length}</span>
            </div>
            ${group.allEntries.map(entry => renderCTSentryEntry(entry)).join('')}
        </div>
    </div>`;
}

// Render a single CT log entry for CTSentry data
function renderCTSentryEntry(entry: CTSentryCertRecord): string {
  const isPrecert = entry.meta.is_precert;
  const logName = entry.meta.log_short_name || 'Unknown log';
  const timestamp = formatDate(entry.meta.timestamp);

  return `
    <div class="entry">
        <div class="entry-header">
            <span class="entry-type ${isPrecert ? 'precert' : 'leaf'}">${isPrecert ? 'Precertificate' : 'Leaf Certificate'}</span>
            <span class="entry-field">
                <span class="label">Log:</span>
                <span class="value">${escapeHtml(logName)}</span>
            </span>
        </div>
        <div class="entry-row">
            <div class="entry-field">
                <span class="label">Logged:</span>
                <span class="value">${escapeHtml(timestamp)}</span>
            </div>
            ${entry.meta.leaf_index !== undefined ? `
            <div class="entry-field">
                <span class="label">Index:</span>
                <span class="value">${entry.meta.leaf_index}</span>
            </div>
            ` : ''}
        </div>
    </div>`;
}

// Format an ISO date string nicely
function formatDate(isoDate: string): string {
  if (!isoDate) return 'Unknown';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}


