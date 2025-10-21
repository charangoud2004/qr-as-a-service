const { app } = require("@azure/functions");
const QRCode = require("qrcode");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

app.http("generateQR", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    // Define standard CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };

    // Handle OPTIONS preflight request
    if (request.method === "OPTIONS") {
      return {
        status: 200,
        headers: corsHeaders
      };
    }

    try {
      // Get URL from request
      let url;
      if (request.method === "POST") {
        try {
          const body = await request.json();
          url = body?.url;
        } catch (e) {
          context.log("JSON parse error:", e);
        }
      } else {
        url = request.query.get("url");
      }

      // Check if URL exists
      if (!url) {
        return {
          status: 400,
          jsonBody: { error: "URL parameter is required" },
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        };
      }

      // Generate QR code as PNG buffer
      const pngBuffer = await QRCode.toBuffer(url, {
        width: 300,
        margin: 2
      });

      // Upload to Blob Storage in azuze
      const connectionString = process.env.QrStorageConnectionString;
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient("qr-codes");

      // Generate unique filename
      const timestamp = Date.now();
      const uuid = uuidv4();
      const blobName = `qr-${timestamp}-${uuid}.png`;

      // Upload blob with correct content type
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(pngBuffer, pngBuffer.length, {
        blobHTTPHeaders: { blobContentType: 'image/png' }
      });

      // Get public URL 
      const blobUrl = blockBlobClient.url;

      // Return blob URL
      return {
        status: 200,
        jsonBody: {
          success: true,
          qrUrl: blobUrl,
          blobName: blobName,
          generatedAt: new Date().toISOString()
        },
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      };
    } catch (error) {
      context.log("Error:", error.message);
      
      // Return error with CORS headers
      return {
        status: 500,
        jsonBody: { error: error.message },
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      };
    }
  }
});