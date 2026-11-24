import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const FREQ_LABELS = {
  immediate: ['Immediate', 'As soon as a matching story is published'],
  hourly: ['Hourly digest', 'One summary at the top of every hour'],
  daily: ['Daily digest', 'One summary every morning at 8:00 (server time)'],
};

const urlBase64ToUint8Array = (b64) => {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-red-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export default function Preferences({ meta }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    categories: user.categories,
    sources: user.sources,
    frequency: user.frequency,
    channels: user.channels,
  });
  const [pushEnabled, setPushEnabled] = useState(user.pushEnabled);
  const [saving, setSaving] = useState(false);

  const toggleIn = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const setChannel = (k, v) => setForm((f) => ({ ...f, channels: { ...f.channels, [k]: v } }));

  const togglePush = async (on) => {
    if (!on) {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
        const d = await api('/preferences/push-subscription', { method: 'DELETE' });
        setUser(d.preferences);
        setPushEnabled(false);
        setChannel('push', false);
      } catch (e) {
        toast({ title: 'Could not disable push', body: e.message, tone: 'error' });
      }
      return;
    }
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push is not supported in this browser');
      if (!meta.vapidPublicKey) throw new Error('Push is not configured on the server (missing VAPID keys)');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was denied');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(meta.vapidPublicKey),
        }));
      const d = await api('/preferences/push-subscription', { method: 'POST', body: { subscription: sub.toJSON() } });
      setUser(d.preferences);
      setPushEnabled(true);
      setChannel('push', true);
      toast({ title: 'Push notifications enabled' });
    } catch (e) {
      toast({ title: 'Could not enable push', body: e.message, tone: 'error' });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = await api('/preferences', { method: 'PUT', body: form });
      setUser(d.preferences);
      toast({ title: 'Preferences saved' });
    } catch (e) {
      toast({ title: 'Save failed', body: e.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-1 font-semibold">Categories</h3>
        <p className="mb-2 text-xs text-slate-500">Subscribe to the topics you care about.</p>
        <div className="divide-y divide-slate-100">
          {meta.categories.map((c) => (
            <Toggle key={c} label={<span className="capitalize">{c}</span>} checked={form.categories.includes(c)} onChange={() => toggleIn('categories', c)} />
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-1 font-semibold">Sources</h3>
        <p className="mb-2 text-xs text-slate-500">
          {form.sources.length ? `${form.sources.length} selected` : 'None selected — you will receive alerts from all sources.'}
        </p>
        <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto pr-1">
          {meta.sources.length === 0 && <p className="py-2 text-sm text-slate-500">Sources appear after the first fetch.</p>}
          {meta.sources.map((s) => (
            <Toggle key={s} label={s} checked={form.sources.includes(s)} onChange={() => toggleIn('sources', s)} />
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-1 font-semibold">Delivery channels</h3>
        <p className="mb-2 text-xs text-slate-500">In-app alerts are always on.</p>
        <div className="divide-y divide-slate-100">
          <Toggle label="Email" hint={user.email} checked={form.channels.email} onChange={(v) => setChannel('email', v)} />
          <Toggle label="Browser push" hint="Notifications even when the tab is closed" checked={pushEnabled && form.channels.push} onChange={togglePush} />
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-1 font-semibold">Frequency</h3>
        <p className="mb-2 text-xs text-slate-500">How often should we alert you?</p>
        <div className="space-y-2">
          {Object.entries(FREQ_LABELS).map(([key, [label, hint]]) => (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                form.frequency === key ? 'border-red-500 bg-red-50' : 'border-slate-200'
              }`}
            >
              <input type="radio" name="frequency" className="mt-1 accent-red-600" checked={form.frequency === key} onChange={() => setForm((f) => ({ ...f, frequency: key }))} />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
      </div>
    </section>
  );
}
