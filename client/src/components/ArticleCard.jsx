const colors = {
  politics: 'bg-purple-100 text-purple-700',
  sports: 'bg-green-100 text-green-700',
  technology: 'bg-blue-100 text-blue-700',
  business: 'bg-amber-100 text-amber-700',
  health: 'bg-rose-100 text-rose-700',
  general: 'bg-slate-100 text-slate-700',
};

export const timeAgo = (date) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
};

export function CategoryBadge({ category }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${colors[category] || colors.general}`}>
      {category}
    </span>
  );
}

export default function ArticleCard({ article, highlight = false, footer }) {
  return (
    <article className={`card flex gap-3 p-3 ${highlight ? 'animate-slideIn ring-2 ring-red-200' : ''}`}>
      {article.image && (
        <img
          src={article.image}
          alt=""
          loading="lazy"
          className="hidden h-20 w-28 shrink-0 rounded-lg object-cover sm:block"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <CategoryBadge category={article.category} />
          <span className="font-medium text-slate-700">{article.source}</span>
          <span>· {timeAgo(article.publishedAt)}</span>
          {highlight && <span className="rounded bg-red-600 px-1.5 text-[10px] font-bold uppercase text-white">New</span>}
        </div>
        <a href={article.url} target="_blank" rel="noreferrer" className="font-semibold leading-snug hover:text-red-600">
          {article.title}
        </a>
        {article.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{article.summary}</p>}
        {footer}
      </div>
    </article>
  );
}
