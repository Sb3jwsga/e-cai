import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appscriptUrl = "https://script.google.com/macros/s/AKfycbxV0pXMVsBvbYiDZKjkJP4JtJULBiKiAEoJhn90WGCwdoVe2WJ64dxzlyVxm_oIxT0W/exec";
  
  try {
    const url = new URL(appscriptUrl);
    
    // Append query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        url.searchParams.append(key, req.query[key] as string);
      });
    }

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
      res.status(200).json(data);
    } catch (e) {
      // If result is not JSON, return as is or wraps it
      res.status(200).json({ result: text });
    }
  } catch (error) {
    console.error("Vercel Proxy Error:", error);
    res.status(500).json({ error: "Failed to connect to Google Apps Script via Vercel Function." });
  }
}
