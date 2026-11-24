import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../context/SocketContext';
import ArticleCard from './ArticleCard';

const CHANNEL_LABEL = { live: 'In-app', email: 'Email', push: 'Push' };

export default function AlertHistory({ onUnreadChange }) {
  const { socket } = useSocket();
  const [filters, setFilters] = useState({ q: '', channel: '', unread: '' });
  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (p, f) => {
      setLoading(true);
      setError('');
      try {
        const d = await api('/alerts', { params: { ...f, page: p } });
        setAlerts((prev) => (p === 1 ? d.alerts : [...prev, ...d.alerts]));
        setHasMore(d.hasMore);
        setPage(p);
        onUnreadChange(d.unread);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [onUnreadChange]
  );

  useEffect(() => {
    const t = setTimeout(() => load(1, filters), 300);
    return () => clearTimeout(t);
  }, [filters, load]);

  // refresh when new alerts arrive in real time
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load(1, filters);
    socket.on('alert:new', refresh);
    socket.on('alert:digest', refresh);
    return () => {
      socket.off('alert:new', refresh);
      socket.off('alert:digest', refresh);
    };
  }, [socket, load, filters]);

  const markRead = async (alert) => {
    if (alert.read) return;
    await api(`/alerts/${alert._id}/read`, { method: 'PATCH' }).catch(() => {});
    load(1, filters);
  };

  const markAll = async () => {
    await api('/alerts/read-all', { method: 'POST' }).catch(() => {});
    load(1, filters);
  };

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input className="input !w-auto min-w-[10rem] flex-1" placeholder="Search alerts…" value={filters.q} onChange={set('q')} />
        <select className="input !w-auto" value={filters.channel} onChange={set('channel')}>
          <option value="">All channels</option>
          <option value="live">In-app</option>
          <option value="email">Email</option>
          <option value="push">Push</option>
        </select>
        <select className="input !w-auto" value={filters.unread} onChange={set('unread')}>
          <option value="">All</option>
          <option value="true">Unread only</option>
        </select>
        <button className="btn-ghost" onClick={markAll}>Mark all read</button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a._id} className={a.read ? 'opacity-70' : ''}>
            <ArticleCard
              article={a.article}
              footer={
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{CHANNEL_LABEL[a.channel]}</span>
                  <span>Sent {new Date(a.sentAt).toLocaleString()}</span>
                  {a.read ? (
                    <span className="text-green-600">✓ Read</span>
                  ) : (
                    <button className="font-medium text-red-600 hover:underline" onClick={() => markRead(a)}>Mark as read</button>
                  )}
                </div>
              }
            />
          </div>
        ))}
        {!loading && !alerts.length && !error && (
          <p className="py-10 text-center text-slate-500">No alerts yet. Matching stories will show up here.</p>
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
