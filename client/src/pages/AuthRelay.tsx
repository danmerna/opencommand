/**
 * AuthRelay — same-origin cookie relay page
 *
 * Problem: iOS Safari (ITP) and other strict-cookie browsers drop SameSite:None
 * cookies that are set during a cross-site redirect chain. The OAuth portal
 * (api.manus.im) redirects to /api/oauth/callback, which sets the session
 * cookie and immediately redirects to the final destination. The browser sees
 * the cookie as set during a cross-site navigation and blocks it on the first
 * API call.
 *
 * Solution: /api/oauth/callback redirects to /auth/relay?to=<destination>
 * instead of directly to the destination. This page is served from the same
 * origin that set the cookie, so the browser treats it as a same-site load.
 * After a short tick (to let the cookie settle), we navigate to the final
 * destination via window.location.replace().
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AuthRelay() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"verifying" | "redirecting" | "error">("verifying");

  useEffect(() => {
    // Parse the destination from the query string
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to") || "/";

    // Validate destination — only allow same-origin paths to prevent open redirect
    let safeTo = "/";
    try {
      // If it starts with "/" it's a relative path — safe
      if (to.startsWith("/") && !to.startsWith("//")) {
        safeTo = to;
      } else {
        // Try parsing as URL — only allow same origin
        const url = new URL(to, window.location.origin);
        if (url.origin === window.location.origin) {
          safeTo = url.pathname + url.search + url.hash;
        }
      }
    } catch {
      safeTo = "/";
    }

    // Give the browser two ticks to fully commit the cookie before navigating.
    // This is the key fix: the cookie was set on the previous request
    // (/api/oauth/callback), and this same-origin page load gives the browser
    // a chance to persist it before we fire any API calls.
    const timer = setTimeout(() => {
      setStatus("redirecting");
      // Use replace so the relay page doesn't appear in browser history
      window.location.replace(safeTo);
    }, 150);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "verifying" || status === "redirecting" ? (
          <>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              {status === "verifying" ? "Signing you in…" : "Redirecting…"}
            </p>
          </>
        ) : (
          <p className="text-sm text-destructive">
            Login failed. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
