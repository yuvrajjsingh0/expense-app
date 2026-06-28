import type { Category } from "./types";

export interface MerchantRule {
  /** Lowercase substring matched against the counterparty text or VPA local part. */
  match: string;
  brand: string;
  category: Category;
}

// Order matters. More specific patterns sit above broader ones so that
// "swiggy instamart" resolves to groceries before the bare "swiggy" food rule.
export const MERCHANTS: MerchantRule[] = [
  { match: "instamart", brand: "Instamart", category: "groceries" },
  { match: "third wave", brand: "Third Wave Coffee", category: "food" },
  { match: "swiggy", brand: "Swiggy", category: "food" },
  { match: "zomato", brand: "Zomato", category: "food" },
  { match: "starbucks", brand: "Starbucks", category: "food" },
  { match: "domino", brand: "Domino's", category: "food" },
  { match: "mcdonald", brand: "McDonald's", category: "food" },

  { match: "bigbasket", brand: "BigBasket", category: "groceries" },
  { match: "blinkit", brand: "Blinkit", category: "groceries" },
  { match: "zepto", brand: "Zepto", category: "groceries" },
  { match: "dmart", brand: "DMart", category: "groceries" },

  { match: "uber", brand: "Uber", category: "transport" },
  { match: "rapido", brand: "Rapido", category: "transport" },
  { match: "ola", brand: "Ola", category: "transport" },
  { match: "metro", brand: "Metro", category: "transport" },
  { match: "irctc", brand: "IRCTC", category: "transport" },
  { match: "indian oil", brand: "Indian Oil", category: "transport" },

  { match: "amazon", brand: "Amazon", category: "shopping" },
  { match: "flipkart", brand: "Flipkart", category: "shopping" },
  { match: "myntra", brand: "Myntra", category: "shopping" },
  { match: "ajio", brand: "Ajio", category: "shopping" },
  { match: "nykaa", brand: "Nykaa", category: "shopping" },

  { match: "netflix", brand: "Netflix", category: "entertainment" },
  { match: "spotify", brand: "Spotify", category: "entertainment" },
  { match: "hotstar", brand: "Hotstar", category: "entertainment" },
  { match: "bookmyshow", brand: "BookMyShow", category: "entertainment" },
  { match: "prime video", brand: "Prime Video", category: "entertainment" },

  { match: "jio", brand: "Jio", category: "bills" },
  { match: "airtel", brand: "Airtel", category: "bills" },
  { match: "bescom", brand: "BESCOM", category: "bills" },
  { match: "electricity", brand: "Electricity", category: "bills" },
  { match: "tata power", brand: "Tata Power", category: "bills" },
  { match: "act fibernet", brand: "ACT Fibernet", category: "bills" },

  { match: "apollo", brand: "Apollo Pharmacy", category: "health" },
  { match: "pharmeasy", brand: "PharmEasy", category: "health" },
  { match: "cult", brand: "Cult.fit", category: "health" },
  { match: "practo", brand: "Practo", category: "health" },
  { match: "1mg", brand: "Tata 1mg", category: "health" },
];

/**
 * Resolve a counterparty string to a brand and category.
 * Returns the cleaned name with category "others" when nothing matches.
 */
export function categorise(name: string): { brand?: string; category: Category } {
  const lower = name.toLowerCase();
  for (const rule of MERCHANTS) {
    if (lower.includes(rule.match)) {
      return { brand: rule.brand, category: rule.category };
    }
  }
  return { category: "others" };
}
