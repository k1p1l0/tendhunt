import { NotificationsPageClient } from "./client";
import { NotificationsBreadcrumb } from "./breadcrumb";

export default function NotificationsPage() {
  return (
    <>
      <NotificationsBreadcrumb />
      <NotificationsPageClient />
    </>
  );
}
