interface TokenPayload {
  sub: string
  user_id: string
  exp: number
  type: 'access' | 'refresh'
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    // JWT structure: header.payload.signature
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    
    // Replace URL-safe characters and add padding
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4)
    
    // Decode base64
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    return JSON.parse(jsonPayload) as TokenPayload
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

export function isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
  const decoded = decodeToken(token)
  if (!decoded) return true
  
  const currentTime = Date.now() / 1000  // Convert to seconds
  const timeUntilExpiry = decoded.exp - currentTime
  
  return timeUntilExpiry < thresholdSeconds  // Less than threshold seconds remaining
}

export function getTokenExpiryTime(token: string): Date | null {
  const decoded = decodeToken(token)
  if (!decoded) return null
  return new Date(decoded.exp * 1000)
}
