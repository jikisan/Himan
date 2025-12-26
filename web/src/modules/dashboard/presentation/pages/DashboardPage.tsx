import { useAuth } from "@auth/presentation/hooks";
import { Link } from "react-router-dom";
import { FileText, User, Settings, KeyRound } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export const DashboardPage = () => {
  const { user } = useAuth();

  const quickLinks = [
    {
      to: "/notes",
      icon: FileText,
      label: "Notes",
      description: "Manage your notes",
    },
    {
      to: "/settings",
      icon: KeyRound,
      label: "Password",
      description: "Manage your password",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.email?.split("@")[0] || "User"}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Quick access to your tools and settings.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="group">
            <Card className="transition-all hover:shadow-lg bg-card hover:border-primary/50">
              <CardHeader>
                <link.icon className="h-8 w-8 text-primary mb-2" />
                <div className="flex flex-col w-full items-end justify-end">
                  <CardTitle>{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
