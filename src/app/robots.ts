import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/private/'], // Protect admin routes
        },
        sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/sitemap.xml`,
    };
}
