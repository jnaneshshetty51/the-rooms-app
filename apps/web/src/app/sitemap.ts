import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://therooms.in'

export default function sitemap(): MetadataRoute.Sitemap {
    const currentDate = new Date().toISOString()

    const routes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/pricing`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/rooms`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/about`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/contact`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/login`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ]

    return routes
}
