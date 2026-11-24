export const CATEGORIES = ['politics', 'sports', 'technology', 'business', 'health', 'general'];
export const FREQUENCIES = ['immediate', 'hourly', 'daily'];
export const CHANNELS = ['email', 'push', 'live'];

// RSS fallback feeds: [source name, category, url]
export const RSS_FEEDS = [
  ['BBC News', 'general', 'https://feeds.bbci.co.uk/news/rss.xml'],
  ['BBC News', 'politics', 'https://feeds.bbci.co.uk/news/politics/rss.xml'],
  ['BBC News', 'business', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
  ['BBC News', 'technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml'],
  ['BBC News', 'health', 'https://feeds.bbci.co.uk/news/health/rss.xml'],
  ['BBC Sport', 'sports', 'https://feeds.bbci.co.uk/sport/rss.xml'],
  ['The Guardian', 'general', 'https://www.theguardian.com/world/rss'],
  ['The Guardian', 'politics', 'https://www.theguardian.com/politics/rss'],
  ['The Guardian', 'sports', 'https://www.theguardian.com/sport/rss'],
  ['The Guardian', 'technology', 'https://www.theguardian.com/technology/rss'],
  ['The Guardian', 'business', 'https://www.theguardian.com/uk/business/rss'],
  ['NPR', 'general', 'https://feeds.npr.org/1001/rss.xml'],
  ['NPR', 'politics', 'https://feeds.npr.org/1014/rss.xml'],
  ['NPR', 'technology', 'https://feeds.npr.org/1019/rss.xml'],
  ['NPR', 'business', 'https://feeds.npr.org/1006/rss.xml'],
  ['NPR', 'health', 'https://feeds.npr.org/1128/rss.xml'],
  ['TechCrunch', 'technology', 'https://techcrunch.com/feed/'],
  ['ESPN', 'sports', 'https://www.espn.com/espn/rss/news'],
];
