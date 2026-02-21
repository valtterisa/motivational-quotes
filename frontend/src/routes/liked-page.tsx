import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/state/use-auth";
import { apiCall, queryKeys } from "@/lib/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Bookmark } from "lucide-react";
import type { FeedQuote } from "./feed-page";

export const LikedPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboard.liked(),
    queryFn: () =>
      apiCall<{ items: FeedQuote[] }>("/api/v1/dashboard/liked"),
    enabled: !!user,
  });

  const likeMutation = useMutation({
    mutationFn: ({
      quoteId,
      action,
    }: {
      quoteId: string;
      action: "like" | "unlike";
    }) =>
      action === "like"
        ? apiCall(`/api/v1/feed/likes/${quoteId}`, { method: "POST" })
        : apiCall(`/api/v1/feed/likes/${quoteId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.liked() });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({
      quoteId,
      action,
    }: {
      quoteId: string;
      action: "save" | "unsave";
    }) =>
      action === "save"
        ? apiCall(`/api/v1/feed/saved/${quoteId}`, { method: "POST" })
        : apiCall(`/api/v1/feed/saved/${quoteId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.liked() });
    },
  });

  const quotes = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <p className="text-muted-foreground text-sm text-center">Loading...</p>
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Liked Quotes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Quotes you&apos;ve liked
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              You haven&apos;t liked any quotes yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {quotes.map((q) => (
            <Card key={q.id} className="overflow-hidden border-0 shadow-sm bg-card/80 hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-2 px-6">
                <p className="text-xl leading-relaxed text-foreground/95 font-medium">
                  {q.text}
                </p>
                {q.author && (
                  <p className="text-sm text-muted-foreground mt-3 font-medium">
                    — {q.author}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/80 mt-2">
                  {new Date(q.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2 border-t border-border/60 pt-4 pb-6 px-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] min-w-[44px] gap-1.5"
                  onClick={() =>
                    likeMutation.mutate({
                      quoteId: q.id,
                      action: q.liked ? "unlike" : "like",
                    })
                  }
                  disabled={!user}
                  aria-label={q.liked ? "Unlike quote" : "Like quote"}
                >
                  <Heart
                    className="size-5"
                    fill={q.liked ? "currentColor" : "none"}
                  />
                  <span>{q.likeCount}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() =>
                    saveMutation.mutate({
                      quoteId: q.id,
                      action: q.saved ? "unsave" : "save",
                    })
                  }
                  disabled={!user}
                  aria-label={q.saved ? "Unsave quote" : "Save quote"}
                >
                  <Bookmark
                    className="size-5"
                    fill={q.saved ? "currentColor" : "none"}
                  />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
