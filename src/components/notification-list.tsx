import Link from "next/link";
import { markAllRead } from "@/app/actions/account";
import { relTime } from "@/lib/format";

export function NotificationList({ items, unread }: { items: { id: string; title: string; body: string; href: string | null; readAt: Date | null; createdAt: Date }[]; unread: number }) {
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="row between mb-2">
        <p className="muted small">{unread ? `${unread} unread` : "You're all caught up."}</p>
        {unread > 0 && <form action={markAllRead}><button className="btn sm">Mark all as read</button></form>}
      </div>
      {items.length === 0 ? (
        <div className="empty panel"><span className="cairn" aria-hidden><i /><i /><i /></span><p className="h4">No notifications</p><p className="small muted">Reviews, partner requests and licence reminders will appear here.</p></div>
      ) : (
        <ul className="list ruled">
          {items.map((n) => (
            <li key={n.id} className="row top" style={{ padding: "14px 0", ["--gap" as string]: "12px", flexWrap: "nowrap" }}>
              <span aria-hidden style={{ width: 8, height: 8, marginTop: 8, borderRadius: 9, flex: "none", background: n.readAt ? "transparent" : "var(--accent)" }} />
              <div className="grow">
                <p className={n.readAt ? "" : "strong"}>{n.href ? <Link href={n.href} style={{ color: "inherit" }}>{n.title}</Link> : n.title}</p>
                <p className="small muted">{n.body}</p>
              </div>
              <span className="xs muted nowrap">{relTime(n.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
