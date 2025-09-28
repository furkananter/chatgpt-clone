import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SquarePen, Search } from "lucide-react";
import { GPTsIcon, VideoIcon, LibraryIcon } from "../../icons";

export const SidebarHeader: React.FC = () => {
  return (
    <div className="px-3">
      <div className="flex flex-col gap-2">
        <Button
          asChild
          variant="ghost"
          className="flex items-center font-normal justify-start rounded-xl hover:text-foreground text-muted-foreground hover:bg-muted"
        >
          <Link href="/chat" className="flex items-center gap-2">
            <SquarePen className="h-4 w-4" />
            New chat
          </Link>
        </Button>

        <Button
          variant="ghost"
          className="flex items-center font-normal justify-start rounded-xl hover:text-foreground text-muted-foreground hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          Search chats
        </Button>
        <br />
        <Button
          variant="ghost"
          className="flex items-center font-normal justify-start rounded-xl hover:text-foreground text-muted-foreground hover:bg-muted"
        >
          <LibraryIcon />
          Library
        </Button>

        <Button
          variant="ghost"
          className="flex items-center font-normal justify-start rounded-xl hover:text-foreground text-muted-foreground hover:bg-muted"
        >
          <VideoIcon />
          Sora
        </Button>

        <Button
          variant="ghost"
          className="flex items-center font-normal justify-start rounded-xl hover:text-foreground text-muted-foreground hover:bg-muted"
        >
          <GPTsIcon />
          GPTs
        </Button>
      </div>
    </div>
  );
};
