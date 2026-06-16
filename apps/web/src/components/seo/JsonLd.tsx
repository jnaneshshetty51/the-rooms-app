'use client';

// apps/web/src/components/seo/JsonLd.tsx
// JSON-LD structured data for search engines
// Configuration loaded from environment variables for flexibility

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://therooms.in';
const PHONE = process.env.NEXT_PUBLIC_HOTEL_PHONE || '+91-7349047799';
const ADDRESS = process.env.NEXT_PUBLIC_HOTEL_ADDRESS || '103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1';
const CITY = process.env.NEXT_PUBLIC_HOTEL_CITY || 'Bangalore';
const STATE = process.env.NEXT_PUBLIC_HOTEL_STATE || 'Karnataka';
const POSTAL_CODE = process.env.NEXT_PUBLIC_HOTEL_POSTAL_CODE || '560100';
const COUNTRY = process.env.NEXT_PUBLIC_HOTEL_COUNTRY || 'IN';
const LATITUDE = parseFloat(process.env.NEXT_PUBLIC_HOTEL_LATITUDE || '12.9716');
const LONGITUDE = parseFloat(process.env.NEXT_PUBLIC_HOTEL_LONGITUDE || '77.5946');
const STAR_RATING = process.env.NEXT_PUBLIC_HOTEL_STAR_RATING || '4';
const ROOM_COUNT = parseInt(process.env.NEXT_PUBLIC_HOTEL_ROOM_COUNT || '36', 10);

// Social links
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://facebook.com/therooms';
const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/therooms';
const TWITTER_URL = process.env.NEXT_PUBLIC_TWITTER_URL || 'https://twitter.com/therooms';

function getHotelSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "The Rooms",
    description: "Premium hotel accommodations in India. 36 rooms across Studio and Premium categories. Daily and monthly stays available.",
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS,
      addressLocality: CITY,
      addressRegion: STATE,
      postalCode: POSTAL_CODE,
      addressCountry: COUNTRY,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LATITUDE,
      longitude: LONGITUDE,
    },
    starRating: {
      "@type": "Rating",
      ratingValue: STAR_RATING,
    },
    priceRange: "₹₹",
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "WiFi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: true },
      { "@type": "LocationFeatureSpecification", name: "Parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Security", value: true },
    ],
    numberOfRooms: ROOM_COUNT,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
  };
}

function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Rooms",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512x512.png`,
    sameAs: [
      FACEBOOK_URL,
      INSTAGRAM_URL,
      TWITTER_URL,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: PHONE,
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Rooms",
    url: SITE_URL,
    description: "Premium hotel accommodations in India. Book Studio and Premium rooms for daily or monthly stays.",
    publisher: {
      "@type": "Organization",
      name: "The Rooms",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/icon-512x512.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

interface JsonLdProps {
  type?: 'hotel' | 'organization' | 'website' | 'all';
}

export function JsonLd({ type = 'all' }: JsonLdProps) {
  const schemas = {
    hotel: [getHotelSchema()],
    organization: [getOrganizationSchema()],
    website: [getWebsiteSchema()],
    all: [getHotelSchema(), getOrganizationSchema(), getWebsiteSchema()],
  };

  const selectedSchemas = schemas[type];

  return (
    <>
      {selectedSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export default JsonLd;
