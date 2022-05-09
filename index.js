require("dotenv").config();
const https = require("https");
const formidable = require("formidable");
const fs = require("fs");
const PORT = 3000;

const options = {
  key: fs.readFileSync(process.env.keyDir),
  cert: fs.readFileSync(process.env.pemDir),
};

const server = https.createServer(options, (req, res) => {
  if (req.url === "/api/upload" && req.method.toLowerCase() === "post") {
    //Ensure authorization
    if (!assertAuth(req, res)) return;

    // parse a file upload
    const form = formidable({
      multiples: true,
      uploadDir: process.env.uploadDir,
    });

    //rename the incoming file to the file's name
    form.on("file", (field, file) => {
      fs.rename(
        file.filepath,
        form.uploadDir + "/" + file.originalFilename,
        () => {
          console.log(
            `Succesfully renamed ${
              form.uploadDir + "/" + file.originalFilename
            }`
          );
        }
      );
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(err.httpCode || 400, { "Content-Type": "text/plain" });
        res.end(String(err));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ fields, files }, null, 2));
    });
    return;
  } else if (req.url === "/files/list" && req.method.toLowerCase() === "get") {
    if (!assertAuth(req, res)) return;

    try {
      const files = fs
        .readdirSync(process.env.uploadDir, { withFileTypes: true })
        .filter((item) => !item.isDirectory())
        .map((item) => item.name);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ files }));
    } catch (err) {
      console.log(err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("There was a problem getting files.");
    }
  } else if (req.url === "/files/clear" && req.method.toLowerCase() === "get") {
    if (!assertAuth(req, res)) return;
    try {
      fs.readdirSync(process.env.uploadDir).forEach((f) =>
        fs.rmSync(`${process.env.uploadDir}/${f}`)
      );
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Successfully cleared files.");
    } catch (err) {
      console.log(err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("There was a problem clearing files.");
    }
  } else if (req.url === "/health" && req.method.toLowerCase() === "get") {
    console.log("Request for health check received.");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("Online.");
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
