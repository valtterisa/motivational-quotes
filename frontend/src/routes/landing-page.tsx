import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const LandingPage = () => {
  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Motivational Quotes API</CardTitle>
          <CardDescription>
            Get fresh motivation on demand with a simple API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild className="flex-1">
            <Link to="/signup">Get an API key</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
