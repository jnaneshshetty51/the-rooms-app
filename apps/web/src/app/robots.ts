import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://therooms.in'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/book',
                    '/offline',
                    '/(dashboard)/',
                    '/(auth)/',
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
