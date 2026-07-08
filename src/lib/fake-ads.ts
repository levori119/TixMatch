// Placeholder promotional ads (fake, for now). Replace with a real ads/campaigns
// source later. No external images — gradient + emoji.
export type FakeAd = {
  id: string;
  title: string;
  sub: string;
  emoji: string;
  from: string;
  to: string;
  cta: string;
  href: string;
};

export const FAKE_ADS: FakeAd[] = [
  { id: "summer", title: "פסטיבל הקיץ 2026", sub: "3 ימים · עשרות אמנים", emoji: "🎪", from: "#ff2e93", to: "#7b5cff", cta: "לפרטים", href: "/browse" },
  { id: "friends", title: "חבר מביא חבר", sub: "20% הנחה על העסקה הבאה", emoji: "🎁", from: "#7b5cff", to: "#29e7ff", cta: "הצטרפו", href: "/browse" },
  { id: "vip", title: "כרטיסי VIP", sub: "חוויה שלא תשכחו", emoji: "⭐", from: "#f7971e", to: "#ffd200", cta: "שדרגו", href: "/browse" },
  { id: "nextweek", title: "הופעות השבוע", sub: "אל תפספסו את החמות", emoji: "🔥", from: "#00c9ff", to: "#92fe9d", cta: "גלו", href: "/calendar" },
  { id: "sell", title: "יש לך כרטיס עודף?", sub: "פרסמו למכירה ב-2 דקות", emoji: "💸", from: "#fc4a1a", to: "#f7b733", cta: "למכירה", href: "/sell" },
];
