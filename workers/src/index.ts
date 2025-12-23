import { fetchFromCTSentry, processCTSentryResponse } from './certificates';
import { renderHomepage, renderCTSentryResults } from './templates';

// Define the environment variables available to this Worker
// This tells TypeScript what env vars exist (defined in .dev.vars locally, or via wrangler secret in production)
interface Env {
  CTSENTRY_BEARER_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to different handlers based on the path
    if (path === '/') {
      return handleHome();
    } else if (path === '/search') {
      return handleSearch(url, env);  // Pass env so we can access the token
    } else {
      return new Response('Not Found', { status: 404 });
    }
  },
};

// Handle the homepage
function handleHome(): Response {
  return new Response(renderHomepage(), {
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle the search - NOW USES CTSENTRY!
async function handleSearch(url: URL, env: Env): Promise<Response> {
  const domain = url.searchParams.get('domain')?.trim() || '';
  const notBefore = url.searchParams.get('notBefore')?.trim() || '';

  // Validate domain
  if (!domain) {
    const html = renderCTSentryResults(domain, [], 0, false, 'Please enter a domain name');
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Fetch certificates from CTSentry (your friend's API!)
    const response = await fetchFromCTSentry(domain, env.CTSENTRY_BEARER_TOKEN);

    // Process the response into display-ready groups
    let issuers = processCTSentryResponse(response);

    // Filter by date if provided
    if (notBefore) {
      const filterDate = new Date(notBefore);
      // Filter each issuer's certificates
      for (const issuer of issuers) {
        issuer.certificates = issuer.certificates.filter(cert => {
          const certDate = new Date(cert.notBefore);
          return certDate >= filterDate;
        });
      }
      // Remove issuers with no certificates after filtering
      issuers = issuers.filter(issuer => issuer.certificates.length > 0);
    }

    // Count total certificates across all issuers
    const totalCerts = issuers.reduce((sum, issuer) => sum + issuer.certificates.length, 0);

    // Render the results (including truncation warning if applicable)
    const html = renderCTSentryResults(domain, issuers, totalCerts, response.truncated);
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    const html = renderCTSentryResults(domain, [], 0, false, errorMessage);
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
}
