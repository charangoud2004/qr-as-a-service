const { app } = require("@azure/functions");
const QRCode = require("qrcode");

app.http("generateQR", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      let url;
      // Check the request method to decide how to get the URL
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
          headers: { "Content-Type": "application/json" }
        };
      }

      // Generate QR code as PNG buffer
      const pngBuffer = await QRCode.toBuffer(url, {
        width: 300,
        margin: 2
      });

      // Return raw PNG binary with CORS headers
      return {
        status: 200,
        body: pngBuffer,
        headers: {
          "Content-Type": "image/png",
          "Access-Control-Allow-Origin": "*" // Allows your frontend to call it
        }
      };

    } catch (error) {
      context.log("Error:", error.message);
      return {
        status: 500,
        body: JSON.stringify({ error: "An internal error occurred." }),
        headers: { "Content-Type": "application/json" }
      };
    }
  }
});