import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, Heart, Bookmark, Key, Rss } from "lucide-react";

const quickLinks = [
  { to: "/", label: "Browse Feed", icon: Rss, description: "Discover quotes" },
  { to: "/dashboard/quotes", label: "My Quotes", icon: Quote, description: "Manage your quotes" },
  { to: "/dashboard/liked", label: "Liked", icon: Heart, description: "Quotes you liked" },
  { to: "/dashboard/saved", label: "Saved", icon: Bookmark, description: "Saved for later" },
  { to: "/dashboard/api-keys", label: "API Keys", icon: Key, description: "Create & revoke keys" },
] as const;

export const DashboardHome = () => {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your quotes, likes, and API keys from here.
        </p>
      </div>
      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Quick links</CardTitle>
          <CardDescription>
            Jump to the section you need
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {quickLinks.map(({ to, label, icon: Icon, description }) => (
            <Button
              key={to}
              variant="outline"
              asChild
              className="h-auto py-4 px-4 justify-start gap-3 rounded-xl border-border/80 hover:bg-muted/60 hover:border-primary/20"
            >
              <Link to={to}>
                <Icon className="size-5 shrink-0 text-primary/80" />
                <span className="flex flex-col items-start text-left">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
