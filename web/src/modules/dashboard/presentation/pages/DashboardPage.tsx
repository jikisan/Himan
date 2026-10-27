import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownAZ, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useAuth } from "@auth/presentation/hooks";
import { groupByLetter } from "../../domain/entities";
import type { DashboardAppId, DashboardLayout } from "../../domain/entities";
import { AppIcon } from "../components/AppIcon";
import { CustomizeDashboardDialog } from "../components/CustomizeDashboardDialog";
import { useDashboardApps } from "../hooks/useDashboardApps";
import type { DashboardApp } from "../components/appCatalog";

const LAYOUT_OPTIONS: { value: DashboardLayout; label: string; icon: typeof LayoutGrid }[] = [
  { value: "letters", label: "A–Z", icon: ArrowDownAZ },
  { value: "grid", label: "Grid", icon: LayoutGrid },
];

const AppGrid = ({ apps, badges }: { apps: DashboardApp[]; badges: Partial<Record<DashboardAppId, number>> }) => (
  <ul className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5">
    {apps.map((app) => {
      const count = badges[app.id] ?? 0;
      return (
      <li key={app.id}>
        <Link
          to={app.to}
          aria-label={count ? `${app.label}, ${count} need${count === 1 ? "s" : ""} attention` : app.label}
          className="flex flex-col items-center gap-2 rounded-2xl p-2 text-sm text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="relative">
            <AppIcon icon={app.icon} color={app.color} size="lg" />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white shadow ring-2 ring-background animate-in zoom-in-50 duration-300 motion-reduce:animate-none"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
          {app.label}
        </Link>
      </li>
      );
    })}
  </ul>
);

// iCloud.com-style home: a grid of the apps the user chose to keep here.
export const DashboardPage = () => {
  const { user } = useAuth();
  const { available, visible, hidden, saving, save, badges, layout, saveLayout } = useDashboardApps();
  const [customizing, setCustomizing] = useState(false);
  const [saveError, setSaveError] = useState("");

  const name = user?.email?.split("@")[0] || "User";
  const groups = groupByLetter(visible);

  const handleSave = async (next: DashboardAppId[]) => {
    setSaveError("");
    try {
      await save(next);
      setCustomizing(false);
      toast.success("Dashboard updated");
    } catch {
      setSaveError("Couldn’t save your dashboard. Check your connection and try again.");
    }
  };

  const handleLayout = (next: DashboardLayout) => {
    if (next === layout) return;
    saveLayout(next).catch(() => toast.error("Couldn’t save your view. It will reset next time you sign in."));
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50 via-background to-background dark:from-slate-900">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col items-center text-center">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-slate-300 to-slate-500 text-3xl font-semibold uppercase text-white shadow-md">
            {name[0]}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back, {name}</h1>
          <p className="mt-1 text-muted-foreground">Everything in Himan, at a glance.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>
              <SlidersHorizontal />
              Customize
            </Button>
            <div role="group" aria-label="View" className="inline-flex rounded-md border border-input bg-background p-0.5">
              {LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={layout === value}
                  onClick={() => handleLayout(value)}
                  className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    layout === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {visible.length > 0 && layout === "grid" ? (
          <nav aria-label="Apps" className="mx-auto max-w-3xl">
            <AppGrid apps={groups.flatMap((group) => group.apps)} badges={badges} />
          </nav>
        ) : visible.length > 0 ? (
          <div className="mx-auto max-w-3xl">
            {/* Sticks to the top of the scrolling page so any letter is one tap away. */}
            <nav aria-label="Jump to letter" className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap justify-center gap-1 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
              {groups.map(({ letter }) => (
                <a
                  key={letter}
                  href={`#apps-${letter}`}
                  aria-label={`Jump to ${letter}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(`apps-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {letter}
                </a>
              ))}
            </nav>
            <nav aria-label="Apps" className="space-y-8">
              {groups.map(({ letter, apps }) => (
                <section key={letter} id={`apps-${letter}`} aria-labelledby={`apps-${letter}-title`} className="scroll-mt-20">
                  <h2 id={`apps-${letter}-title`} className="mb-3 border-b border-border pb-1 text-lg font-semibold text-foreground">{letter}</h2>
                  <AppGrid apps={apps} badges={badges} />
                </section>
              ))}
            </nav>
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-8 text-center">
            <p className="font-medium text-foreground">Your dashboard is empty</p>
            <p className="text-sm text-muted-foreground">Every app is hidden. Choose which ones to show here.</p>
            <Button size="sm" onClick={() => setCustomizing(true)}>Choose apps</Button>
          </div>
        )}
      </div>

      <CustomizeDashboardDialog
        open={customizing}
        onOpenChange={(open) => { setCustomizing(open); setSaveError(""); }}
        apps={available}
        hidden={hidden}
        saving={saving}
        error={saveError}
        onSave={handleSave}
      />
    </div>
  );
};
