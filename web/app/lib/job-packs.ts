// Pack definitions — single source of truth for the pricing page, the
// checkout route and the webhook. Isomorphic: must stay free of server-only
// imports (the pricing page component renders these).
export const PACKS = [
	{ id: "1", posts: 1, priceCents: 5000, discount: 0 },
	{ id: "3", posts: 3, priceCents: 12000, discount: 0.2 },
	{ id: "5", posts: 5, priceCents: 17500, discount: 0.3 },
] as const;

export type Pack = (typeof PACKS)[number];

export function findPack(id: string): Pack | undefined {
	return PACKS.find((p) => p.id === id);
}

export function formatRM(cents: number): string {
	return `RM${(cents / 100).toLocaleString("en-US")}`;
}
