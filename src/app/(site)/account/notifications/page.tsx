import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { NotificationList } from "@/components/notification-list";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const u = await requireUser("/account/notifications");
  const items = await db.query.notifications.findMany({ where: eq(schema.notifications.userId, u.id), orderBy: (n, { desc }) => desc(n.createdAt), limit: 100 });
  const unread = items.filter((i) => !i.readAt).length;
  return <NotificationList items={items} unread={unread} />;
}

