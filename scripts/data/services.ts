export interface SeedService {
  slug: string;
  name: string;
  tier: "tier-0" | "tier-1" | "tier-2";
  description: string;
}

export const SERVICES: SeedService[] = [
  {
    slug: "checkout-api",
    name: "checkout-api",
    tier: "tier-0",
    description: "Handles cart finalization, promo codes, and order creation for all storefronts.",
  },
  {
    slug: "payment-service",
    name: "payment-service",
    tier: "tier-0",
    description: "Processes charges, refunds, and webhook delivery to payment providers and merchants.",
  },
  {
    slug: "auth-service",
    name: "auth-service",
    tier: "tier-0",
    description: "Session issuance, token validation, and SSO for all customer- and merchant-facing apps.",
  },
  {
    slug: "notification-worker",
    name: "notification-worker",
    tier: "tier-1",
    description: "Async worker fleet delivering transactional and marketing email/SMS/push notifications.",
  },
  {
    slug: "inventory-service",
    name: "inventory-service",
    tier: "tier-1",
    description: "Tracks warehouse stock levels and serves availability checks to checkout-api.",
  },
  {
    slug: "search-api",
    name: "search-api",
    tier: "tier-1",
    description: "Product search and autocomplete, backed by an Elasticsearch cluster.",
  },
];

export interface SeedEngineer {
  handle: string;
  name: string;
  role: string;
}

export const ENGINEERS: SeedEngineer[] = [
  { handle: "priya.nair", name: "Priya Nair", role: "Senior SRE" },
  { handle: "marcus.oduya", name: "Marcus Oduya", role: "Backend Engineer" },
  { handle: "lena.fischer", name: "Lena Fischer", role: "On-call Engineer" },
  { handle: "devon.reyes", name: "Devon Reyes", role: "Platform Engineer" },
  { handle: "aisha.khan", name: "Aisha Khan", role: "Backend Engineer" },
  { handle: "tom.walsh", name: "Tom Walsh", role: "Senior SRE" },
];
