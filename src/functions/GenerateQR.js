const { app } = require("@azure/functions");
const QRCode = require("qrcode");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

app.http("generateQR", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      // Get URL from request
      let url;
      if (request.method === "POST" && request.body) {
        const body = await request.json();
        url = body?.url;
      } else {
        url = request.query.get("url");
      }

      if (!url) {
        return {
          status: 400,
          body: JSON.stringify({ error: "URL parameter is required" }),
          headers: { "Content-Type": "application/json" },
        };
      }

      // Generate QR code as PNG buffer
      const pngBuffer = await QRCode.toBuffer(url, {
        width: 300,
        margin: 2,
      });

      // Upload to Blob Storage
      const connectionString = process.env.QrStorageConnectionString;
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient("qr-codes");

      // Generate unique filename
      const timestamp = Date.now();
      const uuid = uuidv4();
      const blobName = `qr-${timestamp}-${uuid}.png`;

      // Upload blob
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      // This is the new, corrected line
      await blockBlobClient.upload(pngBuffer, pngBuffer.length, {
        blobHTTPHeaders: { blobContentType: "image/png" },
      });

      // Get public URL
      // Get public URL
      const blobUrl = blockBlobClient.url;

      // Return blob URL
      return {
        status: 200,
        body: JSON.stringify({
          success: true,
          qrUrl: blobUrl,
          blobName: blobName,
          generatedAt: new Date().toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      };
    } catch (error) {
      context.log("Error:", error.message);
      return {
        status: 500,
        body: JSON.stringify({ error: error.message }),
        headers: { "Content-Type": "application/json" },
      };
    }
  },
});
