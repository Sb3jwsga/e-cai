import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy API for Spreadsheet
  app.all("/api/spreadsheet", async (req, res) => {
    console.log(`[API] Spreadsheet Request: ${req.method} action=${req.query.action || req.body?.action} table=${req.query.table || req.body?.table}`);
    
    // URL hardcoded as requested
    const appscriptUrl = "https://script.google.com/macros/s/AKfycbwY0UIwwC2jcfKhtXediVquMwO4f0-krmz6J0lda_w7nzQp064VF3ndAdf4Po5OGmg7/exec";
    
    try {
      const url = new URL(appscriptUrl);
      
      // Append query parameters from req.query
      Object.keys(req.query).forEach(key => {
        url.searchParams.append(key, req.query[key] as string);
      });

      const options: any = {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
        },
        redirect: 'follow'
      };

      if (req.method !== "GET" && req.method !== "HEAD") {
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(url.toString(), options);
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (e) {
        console.error("[Proxy] JSON Parse Error. Raw body:", text);
        res.status(500).json({ 
          error: "Invalid JSON response from Google Apps Script", 
          details: text.substring(0, 500) 
        });
      }
    } catch (error) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to Google Apps Script. Check APPSCRIPT_URL." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
