import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-subtle px-4">
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild className="mt-6">
        <NavLink to="/">Back home</NavLink>
      </Button>
    </div>
  </div>
);

export default NotFound;
