// Environment configuration for development and production
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Auto-detect the correct URLs based on environment
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      // Client-side detection
      const origin = window.location.origin
      
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin // http://localhost:3000
      }
      
      if (origin.includes('footvault.dev')) {
        return origin // https://www.footvault.dev or https://footvault.dev
      }
      
      return origin
    }
    
    // Server-side fallback
    if (isDevelopment) {
      return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
    
    if (isProduction) {
      return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.footvault.dev'
    }
    
    return 'http://localhost:3000'
  }
  
  const baseUrl = getBaseUrl()
  
  return {
    isDevelopment,
    isProduction,
    baseUrl,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    callbackUrl: `${baseUrl}/auth/callback`,
    inventoryUrl: `${baseUrl}/inventory`,
    loginUrl: `${baseUrl}/login`,
  }
}

export default getEnvironmentConfig
