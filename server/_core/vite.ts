import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Route-specific OG tag overrides
      template = injectRouteOgTags(url, template);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/** Inject route-specific OG meta tags for social crawlers */
function injectRouteOgTags(url: string, html: string): string {
  const routeOg: Record<string, { title: string; description: string; image?: string }> = {
    "/onboarding/pro": {
      title: "Executive Onboarding — OpenCommand",
      description: "Meet your AI executive team. ARCH, FORGE, SIGNAL, and LEDGER will interview you to build a self-contextualizing strategy for your business.",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663354746985/WP82CNZ6C5SdwCUYfYptJQ/og-preview-9QrrMCiNVUVUxZncTB4yBo.png",
    },
  };

  const cleanUrl = url.split("?")[0].split("#")[0];
  const override = routeOg[cleanUrl];
  if (!override) return html;

  // Replace OG title
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${override.title}" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${override.title}" />`
  );
  // Replace OG description
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${override.description}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${override.description}" />`
  );
  // Replace page title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${override.title}</title>`
  );
  // Replace OG image if provided
  if (override.image) {
    html = html.replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${override.image}" />`
    );
    html = html.replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${override.image}" />`
    );
  }
  return html;
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (with OG tag injection)
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");
    html = injectRouteOgTags(req.originalUrl, html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
