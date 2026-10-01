import Link from "next/link";

/** Plain answers to the questions first-time customers actually ask. */
export function Faq({ legalAge, place, canOrder }: { legalAge: number | null; place: string; canOrder: boolean }) {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "Who actually sells the products?",
      a: <><p>Licensed cannabis stores. Cairn is the marketplace that puts their shelves side by side. The store you choose prepares your order, checks your ID and takes payment.</p><p>A person checks every store's provincial licence against the regulator's public registry before the store appears. A lapsed licence disappears from Cairn the day it expires.</p></>,
    },
    {
      q: "Do I pay on Cairn?",
      a: <p>No. Nothing is charged online. You pay the store directly when you pick up{canOrder ? " or receive" : ""} your order, by whatever methods that store accepts.</p>,
    },
    {
      q: "What do I need to bring?",
      a: <p>Valid government-issued photo ID{legalAge ? ` showing you're ${legalAge} or older, the legal age in ${place}` : " showing you meet the legal age in your province"}. The store checks it before it hands anything over. No ID, no order.</p>,
    },
    {
      q: "Why can my cart only hold one store?",
      a: <p>So your order can be prepared, ID-checked and handed over in one go. Compare prices across stores first, then fill your cart from the one you pick. You can start a new cart with another store any time.</p>,
    },
    {
      q: "How much can I buy at once?",
      a: <p>Federal law limits what an adult can carry in public to 30 g of dried cannabis or the equivalent. Every product shows how much it counts toward that limit, and your cart keeps a running total so you never go over.</p>,
    },
    {
      q: "Are the THC and CBD numbers accurate?",
      a: <p>They come from the product label, as published by the store. Values on the actual package are the final word. <Link href="/guide#labels">How to read a label</Link>.</p>,
    },
    {
      q: "Is Cairn available where I live?",
      a: <p>Cannabis rules differ by province and territory. Cairn turns on each feature (listings, prices, ordering, delivery) only once the rules for that province have been reviewed, so what you see may differ from a friend elsewhere in Canada.</p>,
    },
    {
      q: "I run a licensed store. How do I join?",
      a: <p>Apply at <Link href="/for-stores">List your store</Link> with your licence. Once it's verified, your menu, stock and hours go live and orders come straight to your counter.</p>,
    },
  ];
  return (
    <div className="faq">
      {items.map((it, i) => (
        <details key={it.q} open={i === 0}>
          <summary>{it.q}</summary>
          <div className="ans">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
