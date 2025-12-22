import { fetchCertificates, groupCertificates, groupByIssuer, filterByNotBefore } from './certificates';
import { renderHomepage, renderResults } from './templates';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to different handlers based on the path
    if (path === '/') {
      return handleHome();
    } else if (path === '/search') {
      return handleSearch(url);
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

// Handle the search
async function handleSearch(url: URL): Promise<Response> {
  const domain = url.searchParams.get('domain')?.trim() || '';
  const notBefore = url.searchParams.get('notBefore')?.trim() || '';

  // Validate domain
  if (!domain) {
    const html = renderResults(domain, [], 0, 'Please enter a domain name');
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Fetch certificates from crt.sh
    let certs = await fetchCertificates(domain);

    // Filter by date if provided
    if (notBefore) {
      certs = filterByNotBefore(certs, notBefore);
    }

    // Group certificates
    const groups = groupCertificates(certs);
    const issuers = groupByIssuer(groups);

    // Render the results
    const html = renderResults(domain, issuers, groups.length);
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    const html = renderResults(domain, [], 0, errorMessage);
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
}
