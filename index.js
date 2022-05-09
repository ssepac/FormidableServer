require('dotenv').config();
const https = require("https");
const formidable = require("formidable");
const fs = require("fs");
const PORT = 3000

const options = {
    key: fs.readFileSync('local.key'),
    cert: fs.readFileSync('local.pem')
  };

const server = https.createServer(options, (req, res) => {
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

    // show a file upload form
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h2>With Node.js <code>"http"</code> module</h2>
      <form action="/api/upload" enctype="multipart/form-data" method="post">
        <div>Text field title: <input type="text" name="title" /></div>
        <div>File: <input type="file" name="multipleFiles" multiple="multiple" /></div>
        <input type="submit" value="Upload" />
      </form>
    `);
});

server.listen(PORT, process.env.ip, () => {
  console.log(`Server listening on https://${process.env.ip}:${PORT}/ ...`);
});
