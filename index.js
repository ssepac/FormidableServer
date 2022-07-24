require("dotenv").config({path:`/home/mendel/repos/BackupServer/.env`});
const https = require("https");
const http = require("http");
const formidable = require("formidable");
const fs = require("fs");
const qs = require('query-string')
const PORT = process.env.port;

//set up redirect for http to https
const redirectServer = http.createServer((req, res)=>{
   res.statusCode = 301;
   res.setHeader('Location', `https://ssepac.xyz${req.url}`);
   res.end(); 
})

//redirectServer.listen(80, process.env.ip, ()=>{
//	console.log(`Started http redirect server on ${process.env.ip}:${80}`)
//})

const cert = fs.readFileSync(process.env.certDir)
const ca = fs.readFileSync(process.env.caDir)
const key = fs.readFileSync(process.env.keyDir)

const options = {
	cert,
	ca,
	key
}

const server = https.createServer(options, (req, res) => {
  
const split = req.url.split('?')
const urlPath = split[0]
  const urlParams = !split[1] ? {} : qs.parse(split[1])
  if (urlPath  === "/api/upload" && req.method.toLowerCase() === "post") {
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
  } else if (urlPath  === "/files/list" && req.method.toLowerCase() === "get") {
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
  } else if (urlPath === "/files/clear" && req.method.toLowerCase() === "get") {
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
else if (urlPath === "/video" && req.method.toLowerCase() === "get"){
	fs.readFile(process.env.projectRoot + "video.html", function (error, pgResp) {
            if (error) {
                res.writeHead(404);
                res.write('Contents you are looking are Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(pgResp);
            }
             
            res.end();
        });
}
//region streaming content (i.e. video serving)
else if (urlPath.includes("/videos/") && req.method.toLowerCase() === "get"){
	
  assertAuthFromQuery(req, res, urlParams)
	
	const videoName = req.url.substr(req.url.indexOf('/videos/') + '/videos/'.length, urlParams.fileName.length+1)
	const range = req.headers.range;
	if(!range){
		res.writeHead(400, {"Content-Type": "text/plain"});
		res.end("No range header was provided.")
		return;
	}
	const videoPath = process.env.videoDir + videoName;
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
else{
	res.writeHead(404, {"Content-Type": "application/json"});
	res.end()
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
