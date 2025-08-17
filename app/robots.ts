import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/inventory',
        '/sales',
        '/checkout',
        '/settings',
        '/add-product',
        '/variants',
        '/archive',
        '/subscription',
        '/auth/',
        '/_next/',
        '/private',
      ],
    },
    sitemap: 'https://https://footvault.dev/sitemap.xml',
  }
}
