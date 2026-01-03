import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/private/'], // Protect admin routes
        },
        sitemap: 'https://clearworth.wisdomwits.com/sitemap.xml',
    };
}
