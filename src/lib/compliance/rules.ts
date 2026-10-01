/**
 * The catalogue of capabilities that depend on provincial/territorial law.
 *
 * Fail-closed: a capability is on only when an administrator has recorded an
 * ALLOWED determination with a source. Missing, UNCONFIRMED or PROHIBITED all
 * mean off. New keys added here start UNCONFIRMED in every jurisdiction.
 */
export const RULES = {
  "retail.directory": {
    group: "Retail",
    label: "List licensed private retailers",
    off: "Store listings aren't available in this province or territory on Cairn yet.",
  },
  "retail.products": {
    group: "Retail",
    label: "Show product availability at stores",
    off: "Product availability isn't shown here. Contact the store directly.",
  },
  "retail.prices": {
    group: "Advertising",
    label: "Show prices",
    off: "Price on request at the store",
  },
  "retail.onlineHandoff": {
    group: "Retail",
    label: "Link to the retailer's own online ordering",
    off: "Online ordering links aren't enabled for this province or territory.",
  },
  "retail.pickup": {
    group: "Retail",
    label: "Show in-store pickup availability",
    off: "Pickup details aren't shown in this province or territory.",
  },
  "retail.delivery": {
    group: "Retail",
    label: "Show retailer delivery availability",
    off: "Delivery details aren't shown in this province or territory.",
  },
  "promo.discounts": {
    group: "Advertising",
    label: "Show retailer discounts or promotions",
    off: "Promotions aren't shown.",
  },
  "product.vapes": {
    group: "Products",
    label: "List vape products",
    off: "Vape products aren't listed in this province or territory.",
  },
  "product.edibles": {
    group: "Products",
    label: "List edibles and beverages",
    off: "Edibles and beverages aren't listed in this province or territory.",
  },
  "partner.referrals": {
    group: "Partners",
    label: "Allow partner referral links to retailers",
    off: "Partner referrals aren't available in this province or territory.",
  },
  "partner.profiles": {
    group: "Partners",
    label: "Publish partner profile pages",
    off: "Partner profiles aren't published here.",
  },
  "partner.compensation": {
    group: "Partners",
    label: "Pay partners for referred purchases",
    off: "Referral earnings aren't available in this province or territory.",
  },
} as const;

export type RuleKey = keyof typeof RULES;
export const RULE_KEYS = Object.keys(RULES) as RuleKey[];
export type RuleState = "ALLOWED" | "PROHIBITED" | "UNCONFIRMED";
