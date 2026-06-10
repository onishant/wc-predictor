import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN' },
  { url: 'https://www.theguardian.com/football/rss', source: 'The Guardian' },
];

const MAX_ARTICLES = 30;
const FETCH_TIMEOUT = 10_000;

type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  imageUrl: string | null;
};

type NewsRow = {
  title: string;
  url: string;
  source: string;
  image_url: string | null;
  summary: string | null;
  published_at: string | null;
  matched_teams: string[];
};

export async function fetchAndStoreNews() {
  // 1. Get teams playing in the next 48 hours
  const now = new Date().toISOString();
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('home_team_id, away_team_id')
    .gte('kickoff_utc', now)
    .lte('kickoff_utc', in48h);

  if (!matches || matches.length === 0) {
    return { articles: 0, teams: 0, reason: 'no_upcoming_matches' };
  }

  const teamIds = new Set<string>();
  for (const m of matches) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }

  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('name, code')
    .in('id', [...teamIds]);

  if (!teams || teams.length === 0) {
    return { articles: 0, teams: 0, reason: 'no_teams_found' };
  }

  // Build search terms: team names + codes, lowercased
  const searchTerms: string[] = [];
  for (const t of teams) {
    searchTerms.push(t.name.toLowerCase());
    if (t.code) searchTerms.push(t.code.toLowerCase());
  }

  // 2. Fetch and parse all RSS feeds
  const allItems: (RssItem & { source: string })[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed => fetchRss(feed.url, feed.source))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // 3. Filter articles that mention any team
  const matched: NewsRow[] = [];

  for (const item of allItems) {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const matchedTeams: string[] = [];

    for (const term of searchTerms) {
      // Match whole word to avoid false positives
      const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
      if (regex.test(text)) {
        matchedTeams.push(term);
      }
    }

    if (matchedTeams.length > 0 && item.link) {
      matched.push({
        title: item.title.trim(),
        url: item.link.trim(),
        source: item.source,
        image_url: item.imageUrl,
        summary: item.description?.trim().slice(0, 300) || null,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        matched_teams: [...new Set(matchedTeams)],
      });
    }
  }

  // 4. Sort by date (newest first), deduplicate by URL, limit
  const seen = new Set<string>();
  const deduped = matched
    .filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    })
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, MAX_ARTICLES);

  // 5. Clear old news and insert new
  await supabaseAdmin.from('news').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (deduped.length > 0) {
    const { error } = await supabaseAdmin.from('news').insert(deduped);
    if (error) throw error;
  }

  return { articles: deduped.length, teams: teams.length };
}

async function fetchRss(url: string, source: string): Promise<(RssItem & { source: string })[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WCPredictor/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRss(xml, source);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

function parseRss(xml: string, source: string): (RssItem & { source: string })[] {
  const items: (RssItem & { source: string })[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractTag(block, 'guid');
    const description = stripHtml(extractTag(block, 'description') || extractTag(block, 'summary') || '');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');

    // Try to get image from media:content, media:thumbnail, enclosure, or og:image in description
    let imageUrl: string | null = null;
    const mediaMatch = block.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i);
    if (mediaMatch) imageUrl = mediaMatch[1];
    if (!imageUrl) {
      const encMatch = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
      if (encMatch) imageUrl = encMatch[1];
    }
    if (!imageUrl) {
      const imgMatch = description.match(/<img[^>]*src="([^"]+)"/i);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    if (title && link) {
      items.push({ title, link, description, pubDate, imageUrl, source });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
