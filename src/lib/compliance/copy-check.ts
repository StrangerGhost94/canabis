/**
 * A first-pass screen for product and profile copy. It catches the obvious
 * problems (health claims, youth appeal, lifestyle promises, inducements)
 * before a human ever has to. It is not a substitute for legal review.
 */
const PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\b(cure[sd]?|treat(s|ment)?|heal(s|ing)?|therap(y|eutic)|medicin(e|al)|anxiety|insomnia|pain relief|depression)\b/i, why: "health or therapeutic claims" },
  { re: /\b(kids?|teens?|children|candy-?like|cartoon|back to school)\b/i, why: "language that could appeal to young people" },
  { re: /\b(sexy|glamou?r|party all night|best night|live your best|unlock your)\b/i, why: "lifestyle associations" },
  { re: /\b(free gift|giveaway|contest|sweepstake|bogo|buy one get)\b/i, why: "inducements such as giveaways or contests" },
];

export function screenCopy(text: string | null | undefined) {
  if (!text) return null;
  const hit = PATTERNS.find((p) => p.re.test(text));
  return hit ? `Remove ${hit.why}. Product copy on Cairn is limited to factual information.` : null;
}
