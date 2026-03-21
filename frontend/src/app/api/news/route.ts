import { NextResponse } from "next/server";

const RSS_FEEDS = [
  {
    name: "The Hindu",
    url: "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
    bias: "Centre-Left",
  },
  {
    name: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeeds/4859228.cms",
    bias: "Centre",
  },
  {
    name: "NDTV",
    url: "https://feeds.feedburner.com/ndtvnews-tamil-nadu",
    bias: "Centre-Left",
  },
];

function parseRSSItems(xml: string): { title: string; link: string; description: string; pub_date: string }[] {
  const items: { title: string; link: string; description: string; pub_date: string }[] = [];

  // Simple regex-based XML parser (runs server-side, no DOMParser)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .trim();

    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .trim();

    const description = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, 300);

    const pub_date = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();

    if (title) {
      items.push({ title, link, description, pub_date });
    }
  }

  return items;
}

export async function GET() {
  const allStories: { title: string; link: string; description: string; pub_date: string; source: string; bias: string }[] = [];

  const fetches = RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "TNElections/1.0" },
        next: { revalidate: 600 }, // cache for 10 minutes
      });
      if (!res.ok) return;
      const xml = await res.text();
      const items = parseRSSItems(xml);
      items.forEach((item) => {
        allStories.push({ ...item, source: feed.name, bias: feed.bias });
      });
    } catch {
      // Skip failed feeds
    }
  });

  await Promise.all(fetches);

  // Sort by date descending
  allStories.sort((a, b) => {
    const da = new Date(a.pub_date || 0).getTime();
    const db = new Date(b.pub_date || 0).getTime();
    return db - da;
  });

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = allStories.filter((s) => {
    const norm = s.title.toLowerCase().trim();
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  return NextResponse.json(unique);
}
