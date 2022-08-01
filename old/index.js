require("dotenv").config({ path: `/home/mendel/repos/BackupServer/.env` });
const https = require("https");
const http = require("http");
const formidable = require("formidable");
const fs = require("fs");
const qs = require("query-string");
const PORT = process.env.port;

const cert = fs.readFileSync(process.env.certDir);
const ca = fs.readFileSync(process.env.caDir);
const key = fs.readFileSync(process.env.keyDir);

const options = {
  cert,
  ca,
  key,
};

const server = https.createServer(options, (req, res) => {
  const split = req.url.split("?");
  const urlPath = split[0];
  const urlParams = !split[1] ? {} : qs.parse(split[1]);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, PUT, POST, DELETE, HEAD, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  if (req.method.toLowerCase() === "options") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end();
    return;
  }

  if (urlPath === "/auth" && req.method.toLowerCase() === "get") {
      console.log(req)
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("received..");
  } else if (req.url === "/health" && req.method.toLowerCase() === "get") {
    console.log("Request for health check received.");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("Online.");
  } else if (urlPath === "/video" && req.method.toLowerCase() === "get") {
    fs.readFile(
      process.env.projectRoot + "video.html",
      function (error, pgResp) {
        if (error) {
          res.writeHead(404);
          res.write("Contents you are looking are Not Found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.write(pgResp);
        }

        res.end();
      }
    );
  } else if (urlPath === "/video/list" && req.method.toLowerCase() === "get") {
    assertAuthFromQuery(req, res, urlParams);

    fs.readFile(
      process.env.projectRoot + "videoList.html",
      function (error, pgResp) {
        if (error) {
          res.writeHead(404);
          res.write("Contents you are looking are Not Found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.write(pgResp);
        }

        res.end();
      }
    );
  }
  //region streaming content (i.e. video serving)
  else if (urlPath === "/videos/list" && req.method.toLowerCase() === "get") {
    assertAuthFromQuery(req, res, urlParams);

    const files = fs
      .readdirSync(process.env.videoDir, { withFileTypes: true })
      .filter((item) => !item.isDirectory()) //shows will not appear til this line removed
      .map((item) => item.name);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ files }));
  } else if (urlPath === "/videos" && req.method.toLowerCase() === "get") {
    assertAuthFromQuery(req, res, urlParams);

    const videoName = urlParams.fileName;
    const videoPath = process.env.videoDir + videoName;
    const range = req.headers.range;

    if (!fs.existsSync(videoPath)) {
      console.log(`Tried to access ${videoPath} which does not exist.`);
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("The file does not exist.");
      return;
    }

    if (!range) {
      console.log("No range header was provided.");
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("No range header was provided.");
      return;
    }
    const videoSize = fs.statSync(videoPath).size;
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);
    const videoStream = fs.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
  }
  //endregion streaming content
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end();
  }
});

server.listen(PORT, process.env.ip, () => {
  console.log(`Server listening on https://${process.env.ip}:${PORT}/ ...`);
});

/** Returns true if authenticated. */
const assertAuth = (req, res) => {
  if (req.headers["pass"] != process.env.pass) {
    console.log("Rejected request because of bad password.");
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Invalid password provided in header.");
    return false;
  }
  return true;
};

const assertAuthFromQuery = (req, res, urlParams) => {
  if (!urlParams || !urlParams.p || urlParams.p != process.env.pass) {
    console.log("Rejected request because of bad password.");
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Invalid password provided in header.");
    return false;
  }
  return true;
};
