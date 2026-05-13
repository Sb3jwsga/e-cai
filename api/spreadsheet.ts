import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appscriptUrl = "https://script.google.com/macros/s/AKfycbxV0pXMVsBvbYiDZKjkJP4JtJULBiKiAEoJhn90WGCwdoVe2WJ64dxzlyVxm_oIxT0W/exec";
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = new URL(appscriptUrl);
    
    // Append query parameters from request to the target URL
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (key !== 'url') { // Avoid adding the vercel-reserved 'url' param if it exists
          url.searchParams.append(key, req.query[key] as string);
        }
      });
    }

    console.log(`[Vercel Proxy] Requesting: ${url.toString()}`);

    const options: any = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      redirect: 'follow', // Crucial for Google Apps Script
      follow: 20,         // Max redirects
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), options);
    const text = await response.text();
    
    console.log(`[Vercel Proxy] Status: ${response.status}`);
    
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch (e) {
      // If result is not JSON, it might be an error page or a raw string
      console.warn("[Vercel Proxy] Response was not JSON:", text.substring(0, 200));
      return res.status(200).json({ 
        success: false, 
        error: "Invalid JSON from Apps Script", 
        raw: text.substring(0, 500) 
      });
    }
  } catch (error) {
    console.error("Vercel Proxy Critical Error:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to connect to Google Apps Script via Vercel.",
      details: String(error)
    });
  }
}
