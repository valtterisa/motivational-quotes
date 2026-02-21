import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/state/use-auth";
import { apiCall, queryKeys } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Quote {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

export const QuotesPage = () => {
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboard.quotes(),
    queryFn: () =>
      apiCall<{ items: Quote[] }>("/api/v1/dashboard/quotes"),
    enabled: !!user,
  });

  const quotes = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <p className="text-muted-foreground text-sm text-center">Loading your quotes...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="max-w-3xl">
        <AlertDescription>Error: {error?.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Quotes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Quotes you&apos;ve added
        </p>
      </div>
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/80 hover:bg-transparent">
                <TableHead className="font-medium">Quote</TableHead>
                <TableHead className="font-medium w-32">Author</TableHead>
                <TableHead className="font-medium w-28">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                    You haven&apos;t added any quotes yet.
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((q) => (
                  <TableRow key={q.id} className="border-border/60">
                    <TableCell className="align-top py-4 text-foreground/90 max-w-md">
                      {q.text}
                    </TableCell>
                    <TableCell className="align-top py-4 text-muted-foreground">
                      {q.author || "—"}
                    </TableCell>
                    <TableCell className="align-top py-4 text-muted-foreground text-sm">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
