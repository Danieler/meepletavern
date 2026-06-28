import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/account/UserAvatar";
import type { PublicUserCard } from "@/lib/publicProfiles";

export function CommunityHeroWidget({ users }: { users: PublicUserCard[] }) {
  if (!users || users.length === 0) return null;

  return (
    <Link 
      href="/taberna"
      prefetch={false}
      className="group relative flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
          <Users size={16} className="text-amber-500" />
          La taberna te espera
        </h3>
        <ChevronRight size={18} className="text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-amber-500" />
      </div>

      <p className="text-sm leading-relaxed text-white/70">
        Descubre a otros jugadores, cotillea sus ludotecas y encuentra tu próxima obsesión.
      </p>

      <div className="mt-2 flex items-center gap-4">
        <div className="flex -space-x-3">
          {users.slice(0, 5).map((user, i) => (
            <div 
              key={user.username} 
              className="relative z-0 transition-transform duration-300 hover:!z-20 hover:scale-110 hover:-translate-y-1"
              style={{ zIndex: 10 - i }}
            >
              <UserAvatar 
                src={user.avatarUrl} 
                name={user.username} 
                size="sm" 
                className="!h-10 !w-10 !rounded-full border-2 border-[#332218] !bg-[#332218] !shadow-md"
              />
            </div>
          ))}
        </div>
        <span className="text-xs font-bold text-amber-500/80 uppercase tracking-wider group-hover:text-amber-500 transition-colors">
          Explorar
        </span>
      </div>
    </Link>
  );
}
