import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const configured = Boolean(env.smtp.host);

const transporter = configured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function sendAlertEmail(user, articles, { digest = false } = {}) {
  const subject = digest
    ? `Your news digest: ${articles.length} new ${articles.length === 1 ? 'story' : 'stories'}`
    : `Breaking: ${articles[0].title}`;

  const items = articles
    .map(
      (a) => `<li style="margin-bottom:14px">
        <a href="${esc(a.url)}" style="font-size:16px;font-weight:600;color:#1d4ed8;text-decoration:none">${esc(a.title)}</a>
        <div style="color:#6b7280;font-size:12px">${esc(a.source)} · ${esc(a.category)}</div>
        ${a.summary ? `<p style="margin:4px 0 0;color:#374151;font-size:14px">${esc(a.summary)}</p>` : ''}
      </li>`
    )
    .join('');

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <h2 style="color:#111827">${digest ? 'Your news digest' : 'Breaking news'}</h2>
    <p style="color:#6b7280">Hi ${esc(user.name)}, here is what matches your preferences.</p>
    <ul style="padding-left:18px">${items}</ul>
    <p style="font-size:12px;color:#9ca3af">Manage alerts or unsubscribe in your <a href="${esc(env.appUrl)}">dashboard</a>.</p>
  </div>`;

  const text = articles.map((a) => `- ${a.title} (${a.source})\n  ${a.url}`).join('\n');

  const info = await transporter.sendMail({ from: env.smtp.from, to: user.email, subject, html, text });
  if (!configured) console.log(`[mail:dev] SMTP not configured; would send "${subject}" to ${user.email}`);
  return info;
}
