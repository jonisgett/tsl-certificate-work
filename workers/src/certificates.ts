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

