import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FileText, KeyRound, CreditCard, HardDrive, Receipt, ShoppingCart, Briefcase, Landmark, Building2, type LucideIcon } from "lucide-react";
import { useAuth } from "@auth/presentation/hooks";
import { useSubscription } from "@subscriptions/presentation/hooks";
import { useNotes } from "@notes/presentation/hooks";
import { usePasswords } from "@passwords/presentation/hooks";
import { useCards } from "@cards/presentation/hooks";
import { useGroceryLists } from "@grocery/presentation/hooks";

// iCloud.com-style home: each app is a tile that previews its own content.

const AppIcon = ({ icon: Icon, color, size = "sm" }: { icon: LucideIcon; color: string; size?: "sm" | "lg" }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-b text-white shadow-sm ${color} ${
      size === "lg" ? "h-14 w-14 rounded-2xl" : "h-8 w-8 rounded-lg"
    }`}
  >
    <Icon className={size === "lg" ? "h-7 w-7" : "h-4 w-4"} />
  </span>
);

const Tile = ({
  to,
  icon,
  color,
  label,
  className = "",
  children,
}: {
  to: string;
  icon: LucideIcon;
  color: string;
  label: string;
  className?: string;
  children: ReactNode;
}) => (
  <Link
    to={to}
    className={`group flex min-h-56 flex-col rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
  >
    <div className="mb-4 flex items-center gap-3">
      <AppIcon icon={icon} color={color} />
      <span className="font-semibold text-foreground">{label}</span>
    </div>
    <div className="flex flex-1 flex-col text-sm">{children}</div>
  </Link>
);

const Rows = ({ loading, empty, rows }: { loading: boolean; empty: string; rows: { key: string; title: string; meta: string }[] }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="m-auto text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((row) => (
        <li key={row.key} className="py-2">
          <p className="truncate font-medium text-foreground">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground">{row.meta}</p>
        </li>
      ))}
    </ul>
  );
};

const BigNumber = ({ loading, value, caption }: { loading: boolean; value: number; caption: string }) => (
  <div className="mt-auto">
    <p className="text-5xl font-semibold tracking-tight text-foreground">{loading ? "–" : value}</p>
    <p className="mt-1 text-muted-foreground">{caption}</p>
  </div>
);

const ago = (date: Date) => formatDistanceToNow(new Date(date), { addSuffix: true });

export const DashboardPage = () => {
  const { user } = useAuth();
  const { tier, isAdmin } = useSubscription();
  const { notes, loading: notesLoading } = useNotes();
  const { passwords, loading: passwordsLoading } = usePasswords();
  const { cards, loading: cardsLoading } = useCards();
  const { lists, loading: listsLoading } = useGroceryLists();

  const canAccessStorage = tier === "enterprise" || isAdmin;
  const name = user?.email?.split("@")[0] || "User";

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const now = new Date();
  const soon = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const expiringCards = cards.filter((c) => new Date(c.expiryYear, c.expiryMonth, 1) <= soon);

  const moreApps = [
    { to: "/government", icon: Landmark, label: "Government", color: "from-teal-400 to-teal-600" },
    { to: "/rentals", icon: Building2, label: "Rentals", color: "from-amber-400 to-orange-600" },
    ...(canAccessStorage ? [{ to: "/storage", icon: HardDrive, label: "Storage", color: "from-sky-400 to-blue-600" }] : []),
    { to: "/invoice-generator", icon: Receipt, label: "Invoices", color: "from-emerald-400 to-green-600" },
    { to: "/career", icon: Briefcase, label: "Career", color: "from-violet-400 to-purple-600" },
  ];

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50 via-background to-background dark:from-slate-900">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col items-center text-center">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-slate-300 to-slate-500 text-3xl font-semibold uppercase text-white shadow-md">
            {name[0]}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back, {name}</h1>
          <p className="mt-1 text-muted-foreground">Everything in Himan, at a glance.</p>
        </header>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Tile to="/notes" icon={FileText} label="Notes" color="from-amber-300 to-yellow-500" className="lg:col-span-2 lg:row-span-2">
            <Rows
              loading={notesLoading}
              empty="No notes yet"
              rows={recentNotes.map((n) => ({ key: n.id, title: n.title || "Untitled", meta: `Edited ${ago(n.updatedAt)}` }))}
            />
          </Tile>

          <Tile to="/passwords" icon={KeyRound} label="Passwords" color="from-slate-500 to-slate-700">
            <BigNumber loading={passwordsLoading} value={passwords.length} caption="saved passwords" />
          </Tile>

          <Tile to="/cards" icon={CreditCard} label="Cards" color="from-indigo-400 to-indigo-600">
            <BigNumber
              loading={cardsLoading}
              value={cards.length}
              caption={expiringCards.length ? `${expiringCards.length} expiring soon` : "cards, none expiring soon"}
            />
          </Tile>

          <Tile to="/grocery" icon={ShoppingCart} label="Grocery" color="from-orange-400 to-red-500">
            <Rows
              loading={listsLoading}
              empty="No lists yet"
              rows={lists.slice(0, 3).map((l) => ({ key: l.id, title: l.name, meta: `${l.itemCount} items` }))}
            />
          </Tile>

          <div className="flex min-h-56 flex-col rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <span className="mb-4 font-semibold text-foreground">More apps</span>
            <div className="grid flex-1 grid-cols-3 content-center gap-4">
              {moreApps.map((app) => (
                <Link
                  key={app.to}
                  to={app.to}
                  className="flex flex-col items-center gap-2 rounded-xl p-1 text-xs text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <AppIcon icon={app.icon} color={app.color} size="lg" />
                  {app.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
