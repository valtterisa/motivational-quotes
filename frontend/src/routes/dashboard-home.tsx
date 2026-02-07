import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const DashboardHome = () => {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Welcome to your dashboard</CardTitle>
        <CardDescription>
          From here you can manage your quotes, API keys, and view API docs.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
};
