import { type ChatSummary } from "@/lib/api/chat";
import { SidebarItem } from "./sidebar-item";

export function SidebarSection({
  title,
  chats,
}: {
  title: string;
  chats: ChatSummary[];
}) {
  if (!chats?.length) return null;
  return (
    <div className="space-y-2">
      <br />
      <div className="px-3 text-xs uppercase font-semibold tracking-wide text-secondary-foreground">
        {title}
      </div>
      <div className="space-y-2">
        {chats.map((c) => (
          <SidebarItem key={c.id} chat={c} />
        ))}
      </div>
    </div>
  );
}
