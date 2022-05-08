require('dotenv').config();
const http = require("http");
const formidable = require("formidable");
const fs = require("fs");
const PORT = 3000

const server = http.createServer((req, res) => {
  if (req.url === "/api/upload" && req.method.toLowerCase() === "post") {
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
  }
});

server.listen(PORT, process.env.ip, () => {
  console.log(`Server listening on http://${process.env.ip}:${PORT}/ ...`);
});
