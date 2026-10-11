import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/magic-link",
                    "/access-denied",
                    "/settings/notifications",
                ],
            },
            {
                userAgent: "Googlebot",
                allow: "/",
                disallow: [
                    "/api/",
                    "/magic-link",
                    "/access-denied",
                ],
            },
        ],
        sitemap: "https://therooms.in/sitemap.xml",
        host: "https://therooms.in",
    };
}
