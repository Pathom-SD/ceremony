import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.LISTEN_HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);
      void handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Request handler error", err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Node 22 ค่าเริ่มต้น requestTimeout ~5 นาที — วิดีโอหลาย GB บน LAN ช้าจะขาดก่อนอัปโหลดครบ
  server.requestTimeout = 0;
  server.headersTimeout = 0;

  const io = new Server(server, {
    path: "/socket.io/",
    cors: { origin: "*" },
  });

  globalThis.__ceremony_io = io;

  server.listen(port, hostname, () => {
    console.log(`> Ceremony ready on http://${hostname}:${port}`);
  });

  server.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
});
