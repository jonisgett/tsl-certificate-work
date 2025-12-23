// Certificate represents a certificate record from crt.sh
// This is like the Go struct with JSON tags
export interface Certificate {
  id: number;
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  not_before: string;
  not_after: string;
  serial_number: string;
  entry_timestamp: string;
  entry_type?: string; // We set this: "Precertificate" or "Leaf Certificate"
}

// CertificateGroup holds certificates that share the same serial number
export interface CertificateGroup {
  serialNumber: string;
  commonName: string;
  issuerName: string;
  notBefore: string;
  notAfter: string;
  notAfterTime: Date;
  entries: Certificate[];
}

// IssuerGroup holds all certificate groups from the same issuer
export interface IssuerGroup {
  issuerName: string;
  displayName: string;
  certificates: CertificateGroup[];
}

// Fetch certificates from crt.sh API
export async function fetchCertificates(domain: string): Promise<Certificate[]> {
  const apiUrl = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'CertificateViewer/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`crt.sh returned status: ${response.status}`);
  }

  const certs: Certificate[] = await response.json();
  return certs;
}

// =============================================================================
// CTSentry API Fetching (NEW)
// =============================================================================

// The API endpoint for CTSentry (token comes from environment variable)
const CTSENTRY_API_URL = "https://query.ctsn.dev/query";

// Fetch certificates from CTSentry API
// This uses POST (not GET) and requires a Bearer token for authentication
// The token is passed in from the environment (not hardcoded!)
export async function fetchFromCTSentry(query: string, bearerToken: string): Promise<CTSentryResponse> {
  const response = await fetch(CTSENTRY_API_URL, {
    method: "POST",                                    // POST, not GET!
    headers: {
      "Authorization": `Bearer ${bearerToken}`,        // Token from env variable
      "Content-Type": "application/json",              // We're sending JSON
    },
    body: JSON.stringify({ q: query }),                // The search query
  });

  if (!response.ok) {
    throw new Error(`CTSentry returned status: ${response.status}`);
  }

  const data: CTSentryResponse = await response.json();
  return data;
}

// =============================================================================
// CTSentry Data Processing (NEW)
// =============================================================================

// A simplified certificate group for display purposes
// This represents ONE unique certificate (identified by QID)
export interface CTSentryCertGroup {
  qid: string;                          // The unique identifier for this cert
  primaryCert: CTSentryCertRecord;      // The leaf certificate (cert[0], guaranteed)
  allEntries: CTSentryCertRecord[];     // All log entries (precerts + leaf)
  issuerDisplayName: string;            // Friendly issuer name for display
  // Convenience fields extracted from primaryCert for easy access:
  commonName: string;
  dnsNames: string[];
  notBefore: string;
  notAfter: string;
  notAfterDate: Date;                   // For sorting by expiration
}

// A group of certificates from the same issuer (for display)
export interface CTSentryIssuerGroup {
  issuerDN: string;                     // Full issuer distinguished name
  displayName: string;                  // Friendly name like "Let's Encrypt (R3)"
  certificates: CTSentryCertGroup[];    // All certs from this issuer
}

// Extract a friendly display name from CTSentry's structured issuer data
// CTSentry gives us structured data, so this is easier than parsing a string!
function extractCTSentryIssuerDisplayName(issuer: CTSentryDistinguishedName): string {
  const org = issuer.organization?.[0] || '';   // First organization name
  const cn = issuer.common_name || '';          // Common name

  if (org && cn) {
    return `${org} (${cn})`;
  } else if (org) {
    return org;
  } else if (cn) {
    return cn;
  }

  // Fallback to full DN if nothing else
  return issuer.dn || 'Unknown Issuer';
}

// Process CTSentry response into groups organized by issuer
// This is the main function that transforms API data into display-ready data
export function processCTSentryResponse(response: CTSentryResponse): CTSentryIssuerGroup[] {
  const certGroups: CTSentryCertGroup[] = [];

  // Step 1: Convert each QID group into a CTSentryCertGroup
  for (const [qid, entries] of Object.entries(response.results)) {
    // cert[0] is guaranteed to be the leaf certificate (your friend's API guarantee!)
    const primaryCert = entries[0];

    // Skip if no cert details (shouldn't happen, but be safe)
    if (!primaryCert.cert) {
      continue;
    }

    const cert = primaryCert.cert;

    // Extract the fields we need for display
    const certGroup: CTSentryCertGroup = {
      qid: qid,
      primaryCert: primaryCert,
      allEntries: entries,
      issuerDisplayName: extractCTSentryIssuerDisplayName(cert.issuer),
      commonName: cert.subject.common_name || cert.names.dns_names?.[0] || 'Unknown',
      dnsNames: cert.names.dns_names || [],
      notBefore: cert.validity.not_before || '',
      notAfter: cert.validity.not_after || '',
      notAfterDate: new Date(cert.validity.not_after || 0),
    };

    certGroups.push(certGroup);
  }

  // Step 2: Group certificates by issuer
  const issuerMap = new Map<string, CTSentryIssuerGroup>();

  for (const certGroup of certGroups) {
    const issuerDN = certGroup.primaryCert.cert?.issuer.dn || 'Unknown';

    if (issuerMap.has(issuerDN)) {
      // Add to existing issuer group
      issuerMap.get(issuerDN)!.certificates.push(certGroup);
    } else {
      // Create new issuer group
      issuerMap.set(issuerDN, {
        issuerDN: issuerDN,
        displayName: certGroup.issuerDisplayName,
        certificates: [certGroup],
      });
    }
  }

  // Step 3: Convert to array and sort
  const issuerGroups: CTSentryIssuerGroup[] = [];

  for (const issuerGroup of issuerMap.values()) {
    // Sort certificates within each issuer by expiration date (newest first)
    issuerGroup.certificates.sort((a, b) =>
      b.notAfterDate.getTime() - a.notAfterDate.getTime()
    );
    issuerGroups.push(issuerGroup);
  }

  // Sort issuers alphabetically by display name
  issuerGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return issuerGroups;
}

// Filter CTSentry results by not_before date
export function filterCTSentryByNotBefore(
  groups: CTSentryCertGroup[],
  notBeforeDate: string
): CTSentryCertGroup[] {
  const filterDate = new Date(notBeforeDate);

  return groups.filter(group => {
    const certDate = new Date(group.notBefore);
    return certDate >= filterDate;
  });
}

// Extract a friendly display name from the full issuer string
// e.g., "C=US, O=Let's Encrypt, CN=R3" -> "Let's Encrypt (R3)"
function extractIssuerDisplayName(issuerName: string): string {
  let org = '';
  let cn = '';

  const parts = issuerName.split(', ');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('O=')) {
      org = trimmed.substring(2);
    } else if (trimmed.startsWith('CN=')) {
      cn = trimmed.substring(3);
    }
  }

  if (org && cn) {
    return `${org} (${cn})`;
  } else if (org) {
    return org;
  } else if (cn) {
    return cn;
  }

  return issuerName;
}

// Label entries as Precertificate or Leaf Certificate
// The entry with the lower ID was logged first = precertificate
function labelEntries(entries: Certificate[]): void {
  if (entries.length === 1) {
    entries[0].entry_type = 'Leaf Certificate';
    return;
  }

  // Sort by ID (lower ID = logged first = precertificate)
  entries.sort((a, b) => a.id - b.id);

  entries.forEach((entry, index) => {
    entry.entry_type = index === 0 ? 'Precertificate' : 'Leaf Certificate';
  });
}

// Group certificates by serial number
export function groupCertificates(certs: Certificate[]): CertificateGroup[] {
  const groupMap = new Map<string, CertificateGroup>();

  for (const cert of certs) {
    if (groupMap.has(cert.serial_number)) {
      // Add to existing group
      groupMap.get(cert.serial_number)!.entries.push(cert);
    } else {
      // Create new group
      const notAfterTime = new Date(cert.not_after);
      groupMap.set(cert.serial_number, {
        serialNumber: cert.serial_number,
        commonName: cert.common_name,
        issuerName: cert.issuer_name,
        notBefore: cert.not_before,
        notAfter: cert.not_after,
        notAfterTime: notAfterTime,
        entries: [cert],
      });
    }
  }

  // Label entries in each group
  const groups: CertificateGroup[] = [];
  for (const group of groupMap.values()) {
    labelEntries(group.entries);
    groups.push(group);
  }

  return groups;
}

// Group certificate groups by issuer
export function groupByIssuer(groups: CertificateGroup[]): IssuerGroup[] {
  const issuerMap = new Map<string, IssuerGroup>();

  for (const group of groups) {
    if (issuerMap.has(group.issuerName)) {
      issuerMap.get(group.issuerName)!.certificates.push(group);
    } else {
      issuerMap.set(group.issuerName, {
        issuerName: group.issuerName,
        displayName: extractIssuerDisplayName(group.issuerName),
        certificates: [group],
      });
    }
  }

  // Convert to array and sort
  const issuers: IssuerGroup[] = [];
  for (const issuer of issuerMap.values()) {
    // Sort certificates within each issuer by NotAfter date (newest first)
    issuer.certificates.sort((a, b) => b.notAfterTime.getTime() - a.notAfterTime.getTime());
    issuers.push(issuer);
  }

  // Sort issuers alphabetically by display name
  issuers.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return issuers;
}

// Filter certificates by not_before date
export function filterByNotBefore(certs: Certificate[], notBeforeDate: string): Certificate[] {
  const filterDate = new Date(notBeforeDate);

  return certs.filter(cert => {
    const certDate = new Date(cert.not_before);
    return certDate >= filterDate;
  });
}

// =============================================================================
// CTSentry API Types (NEW - from query.ctsn.dev)
// =============================================================================
// These are the new data structures for your friend's CTSentry API.
// The API returns certificates already grouped by QID (a unique fingerprint).

// The top-level response from POST /query
export interface CTSentryResponse {
  query: string;        // The domain you searched for
  truncated: boolean;   // True if results were cut off at 9999 records
  total: number;        // Total CT log entries returned
  total_certs: number;  // Number of unique certificates
  results: {
    [qid: string]: CTSentryCertRecord[];  // Grouped by QID
  };
}

// Each certificate record from CTSentry
export interface CTSentryCertRecord {
  meta: CTSentryMeta;
  cert?: CTSentryCertDetails;  // May be missing for some log entries
  ct?: CTSentryCTInfo;
}

// Metadata about when/where this was logged
export interface CTSentryMeta {
  is_precert: boolean;      // True = precertificate, False = leaf certificate
  timestamp: string;        // When the CT log recorded it
  leaf_hash?: string;       // Unique hash of this log entry
  leaf_index?: number;      // Position in the CT log
  log_short_name?: string;  // e.g., "google-xenon2025"
  log_url?: string;         // Full URL of the CT log
  qid?: string;             // The grouping key (64-char hex)
}

// The actual certificate details (much richer than crt.sh!)
export interface CTSentryCertDetails {
  serial_number?: string;
  version?: number;
  signature_algorithm?: string;
  public_key: CTSentryPublicKey;
  subject: CTSentryDistinguishedName;
  issuer: CTSentryDistinguishedName;
  names: CTSentryNames;
  validity: CTSentryValidity;
  basic_constraints: CTSentryBasicConstraints;
  usage: CTSentryUsage;
  policies?: string[];
  aia: CTSentryAIA;
  crl_distribution_points?: string[];
  subject_key_id?: string;
  authority_key_id?: string;
  name_constraints?: CTSentryNameConstraints;
}

// Public key information
export interface CTSentryPublicKey {
  algorithm?: string;    // "RSA", "ECDSA", "Ed25519"
  size_bits?: number;    // Key size (e.g., 2048, 4096)
  curve?: string;        // For ECDSA: "P-256", "P-384"
  rsa_exponent?: number; // For RSA: usually 65537
}

// Subject Alternative Names - all the domains/IPs the cert covers
export interface CTSentryNames {
  dns_names?: string[];
  ip_addresses?: string[];
  email_addresses?: string[];
  uris?: string[];
}

// When the certificate is valid
export interface CTSentryValidity {
  not_before?: string;
  not_after?: string;
  lifetime_days?: number;
}

// Is this a CA certificate?
export interface CTSentryBasicConstraints {
  is_ca: boolean;
  max_path_len?: number;
  max_path_len_zero?: boolean;
}

// What the certificate can be used for
export interface CTSentryUsage {
  key_usage?: string[];          // e.g., ["DigitalSignature", "KeyEncipherment"]
  extended_key_usage?: string[]; // e.g., ["ServerAuth", "ClientAuth"]
}

// Authority Information Access - where to verify the cert
export interface CTSentryAIA {
  ocsp_servers?: string[];
  issuing_certificate_urls?: string[];
}

// Name constraints (for CA certs)
export interface CTSentryNameConstraints {
  permitted_dns_domains?: string[];
  excluded_dns_domains?: string[];
}

// Distinguished Name - who issued or owns the cert
export interface CTSentryDistinguishedName {
  dn?: string;                    // Full DN string
  common_name?: string;
  organization?: string[];
  organizational_unit?: string[];
  country?: string[];
  province?: string[];
  locality?: string[];
  street_address?: string[];
  postal_code?: string[];
}

// Certificate Transparency specific info
export interface CTSentryCTInfo {
  entry_type: "x509" | "precertificate";
  issuer_key_hash_sha256?: string;
  has_ct_poison?: boolean;
  embedded_scts?: CTSentrySCT[];
}

// Signed Certificate Timestamp
export interface CTSentrySCT {
  version: string;
  log_id_sha256_b64: string;
  timestamp: string;
  signature_algorithm: string;
}

