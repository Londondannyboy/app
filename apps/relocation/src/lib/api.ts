/**
 * Get the API base URL for making requests
 * Works with both preview and production deployments
 */
export function getApiUrl(path: string): string {
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL

  // If gateway URL is set, use it
  if (gatewayUrl && gatewayUrl !== '${VERCEL_URL}') {
    return `${gatewayUrl}${path}`
  }

  // Otherwise, use relative path with /api prefix
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/api/${cleanPath}`
}
