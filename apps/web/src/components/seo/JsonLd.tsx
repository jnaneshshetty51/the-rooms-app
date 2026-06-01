'use client';

// apps/web/src/components/seo/JsonLd.tsx
// JSON-LD structured data for search engines

const HOTEL_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: "The Rooms",
  description: "Premium hotel accommodations in India. 36 rooms across Studio and Premium categories. Daily and monthly stays available.",
  url: "https://therooms.in",
  telephone: "+91-9876543210",
  address: {
    "@type": "PostalAddress",
    streetAddress: "MG Road",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    postalCode: "560001",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 12.9716,
    longitude: 77.5946,
  },
  starRating: {
    "@type": "Rating",
    ratingValue: "4",
  },
  priceRange: "₹₹",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "WiFi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: true },
    { "@type": "LocationFeatureSpecification", name: "Parking", value: true },
    { "@type": "LocationFeatureSpecification", name: "Security", value: true },
  ],
  numberOfRooms: 36,
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "The Rooms",
  url: "https://therooms.in",
  logo: "https://therooms.in/icons/icon-512x512.png",
  sameAs: [
    "https://facebook.com/therooms",
    "https://instagram.com/therooms",
    "https://twitter.com/therooms",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-9876543210",
    contactType: "customer service",
    availableLanguage: ["English", "Hindi"],
  },
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "The Rooms",
  url: "https://therooms.in",
  description: "Premium hotel accommodations in India. Book Studio and Premium rooms for daily or monthly stays.",
  publisher: {
    "@type": "Organization",
    name: "The Rooms",
    logo: {
      "@type": "ImageObject",
      url: "https://therooms.in/icons/icon-512x512.png",
    },
  },
  potentialAction: {
    "@type": "SearchAction",
    target: "https://therooms.in/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

interface JsonLdProps {
  type?: 'hotel' | 'organization' | 'website' | 'all';
}

export function JsonLd({ type = 'all' }: JsonLdProps) {
  const schemas = {
    hotel: [HOTEL_SCHEMA],
    organization: [ORGANIZATION_SCHEMA],
    website: [WEBSITE_SCHEMA],
    all: [HOTEL_SCHEMA, ORGANIZATION_SCHEMA, WEBSITE_SCHEMA],
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