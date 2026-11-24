import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import LiveFeed from '../components/LiveFeed';
import Preferences from '../components/Preferences';
import AlertHistory from '../components/AlertHistory';

const TABS = [
  ['feed', 'Live Feed'],
  ['preferences', 'Preferences'],
  ['history', 'Alert History'],
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [tab, setTab] = useState('feed');
  const [meta, setMeta] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api('/news/meta').then(setMeta).catch((e) => toast({ title: 'Failed to load settings', body: e.message, tone: 'error' }));
    api('/alerts', { params: { limit: 1 } }).then((d) => setUnread(d.unread)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // live toasts + native notifications for incoming alerts
  useEffect(() => {
    if (!socket) return;
    const onAlert = ({ alert }) => {
      const a = alert.article;
      setUnread((n) => n + 1);
      toast({ title: a.title, body: `${a.source} · ${a.category}`, url: a.url, tone: 'breaking' });
      if (user.channels.push && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(a.title, { body: `${a.source} · ${a.category}`, icon: '/favicon.svg' });
      }
    };
    const onDigest = ({ count }) => {
      setUnread((n) => n + count);
      toast({ title: 'New digest', body: `${count} new stories match your preferences` });
    };
    socket.on('alert:new', onAlert);
    socket.on('alert:digest', onDigest);
    return () => {
      socket.off('alert:new', onAlert);
      socket.off('alert:digest', onDigest);
    };
  }, [socket, toast, user.channels.push]);

  const onUnreadChange = useCallback((n) => setUnread(n), []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-600 text-sm font-bold text-white">N</div>
            <span className="font-bold">News Alerts</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user.name}</span>
            <button className="btn-ghost !py-1" onClick={logout}>Sign out</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-4">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative border-b-2 px-3 py-2 text-sm font-medium ${
                tab === key ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
              {key === 'history' && unread > 0 && (
                <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {!meta ? (
          <p className="py-10 text-center text-slate-500">Loading…</p>
        ) : (
          <>
            {tab === 'feed' && <LiveFeed meta={meta} />}
            {tab === 'preferences' && <Preferences meta={meta} />}
            {tab === 'history' && <AlertHistory onUnreadChange={onUnreadChange} />}
          </>
        )}
      </main>
    </div>
  );
}
