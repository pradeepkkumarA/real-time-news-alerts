import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../context/SocketContext';
import ArticleCard from './ArticleCard';

export default function LiveFeed({ meta }) {
  const { socket, connected } = useSocket();
  const [filters, setFilters] = useState({ category: '', source: '', q: '' });
  const [articles, setArticles] = useState([]);
  const [fresh, setFresh] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (p, f) => {
    setLoading(true);
    setError('');
    try {
      const d = await api('/news', { params: { ...f, page: p } });
      setArticles((prev) => (p === 1 ? d.articles : [...prev, ...d.articles]));
      setHasMore(d.hasMore);
      setPage(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // debounce filter/search changes
  useEffect(() => {
    const t = setTimeout(() => {
      setFresh(new Set());
      load(1, filters);
    }, 300);
    return () => clearTimeout(t);
  }, [filters, load]);

  // real-time stream
  useEffect(() => {
    if (!socket) return;
    const onNew = ({ articles: incoming }) => {
      const f = filtersRef.current;
      const q = f.q.trim().toLowerCase();
      const relevant = incoming.filter(
        (a) =>
          (!f.category || a.category === f.category) &&
          (!f.source || a.source === f.source) &&
          (!q || a.title.toLowerCase().includes(q))
      );
      if (!relevant.length) return;
      setArticles((prev) => {
        const seen = new Set(prev.map((a) => a._id));
        return [...relevant.filter((a) => !seen.has(a._id)), ...prev];
      });
      setFresh((prev) => new Set([...prev, ...relevant.map((a) => a._id)]));
    };
    socket.on('news:new', onNew);
    return () => socket.off('news:new', onNew);
  }, [socket]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input className="input !w-auto min-w-[10rem] flex-1" placeholder="Search headlines…" value={filters.q} onChange={set('q')} />
        <select className="input !w-auto capitalize" value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {meta.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="input !w-auto" value={filters.source} onChange={set('source')}>
          <option value="">All sources</option>
          {meta.sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-green-500' : 'bg-slate-300'}`} />
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {articles.map((a) => (
          <ArticleCard key={a._id} article={a} highlight={fresh.has(a._id)} />
        ))}
        {!loading && !articles.length && !error && (
          <p className="py-10 text-center text-slate-500">
            No articles yet. The server fetches news every few minutes — check back shortly.
          </p>
        )}
      </div>

      {loading && <p className="text-center text-sm text-slate-500">Loading…</p>}
      {hasMore && !loading && (
        <div className="text-center">
          <button className="btn-ghost" onClick={() => load(page + 1, filters)}>Load more</button>
        </div>
      )}
    </section>
  );
}
