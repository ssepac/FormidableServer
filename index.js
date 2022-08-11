require("dotenv").config(); //TODO: ADD THIS IN
const https = require("https"); // TODO: ADD THIS IN
const http = require("http");
const fs = require("fs");
const qs = require("query-string");
const {
  sendCode,
  verifyCode,
  verifyToken,
} = require("./services/auth/auth-service");
const {
  insertAction,
  ACTION_PRE_FLIGHT,
  ACTION_AUTH,
  ACTION_AUTH_SEND_CODE_ERROR,
  ACTION_GENERIC_ERROR,
  ACTION_AUTH_VERIFY_CODE,
  ACTION_AUTH_VERIFY_ERROR,
  ACTION_HEALTH_CHECK,
  ACTION_VIDEO_LIST,
  ACTION_VIDEO_LIST_NO_FILENAME_ERROR,
  ACTION_VIDEO_LIST_NO_FILE_ERROR,
  ACTION_VIDEO_LIST_NO_RANGE_ERROR,
  ACTION_VIDEO_LOAD,
  ACTION_PAGE_NOT_FOUND_ERROR,
  ACTION_AUTH_INVALID_CREDENTIALS,
  ACTION_AUTH_MISSING_PARAMS_ERROR,
  insertActionToString,
} = require("./services/logging/log-service");
const { insertUserActivity } = require("./db/logging");
const PORT = process.env.port;

const server = http.createServer((req, res) => {
  try {
    const split = req.url.split("?");
    const urlPath = split[0];
    const urlParams = !split[1] ? {} : qs.parse(split[1]);

    setHeaders(res);

    if (req.method.toLowerCase() === "options") {
      finalizeRequest(res, "", {
        identity: req.socket.remoteAddress,
        action: ACTION_PRE_FLIGHT,
      });
      return;
    }

    if (urlPath === "/auth" && req.method.toLowerCase() === "post") {
      const buffer = [];
      req.on("data", (chunk) => {
        buffer.push(chunk);
      });
      req.on("end", () => {
        try {
          const received = buffer.join();
          const parsed = JSON.parse(received);
          const { email } = parsed;
          if (!email) {
            finalizeRequest(
              res,
              "No email was provided in the request",
              {
                identity: req.socket.remoteAddress,
                action: ACTION_AUTH_MISSING_PARAMS_ERROR,
              },
              400
            );
            return;
          }

          const decodedEmail = decodeURIComponent(email);

          sendCode(decodedEmail)
            .then(({error}) => {
              if (error) throw new Error();
              finalizeRequest(res, "Successfully sent verification code.", {
                identity: req.socket.remoteAddress,
                action: ACTION_AUTH,
                param: decodedEmail
              });
            })
            .catch((err) => {
              console.log(err)
              finalizeRequest(
                res,
                `Could not send verification code to ${decodedEmail}.`,
                {
                  identity: req.socket.remoteAddress,
                  action: ACTION_AUTH_SEND_CODE_ERROR,
                },
                500
              );
            });
        } catch (err) {
          console.log(err)
          finalizeRequest(
            res,
            "There was a problem trying to parse the body of the request.",
            {
              identity: req.socket.remoteAddress,
              action: ACTION_GENERIC_ERROR,
              stacktrace: err,
            },
            500
          );
        }
      });
    } else if (
      urlPath === "/auth/token" &&
      req.method.toLowerCase() === "post"
    ) {
      const buffer = [];
      req.on("data", (chunk) => {
        buffer.push(chunk);
      });
      req.on("end", () => {
        try {
          const received = buffer.join();
          const parsed = JSON.parse(received);
          const { email, code } = parsed;
          if (!email || !code) {
            finalizeRequest(
              res,
              "No email and/or code was provided in the request.",
              {
                identity: req.socket.remoteAddress,
                action: ACTION_AUTH_MISSING_PARAMS_ERROR,
              },
              400
            );
            return;
          }

          const decodedEmail = decodeURIComponent(email);

          verifyCode(decodedEmail, code)
            .then((resp) => {
              if (resp.error) throw new Error();
              finalizeRequest(res, resp.token, {
                identity: req.socket.remoteAddress,
                action: ACTION_AUTH_VERIFY_CODE,
                param: code,
              });
            })
            .catch((err) => {
              finalizeRequest(
                res,
                "Could not verify code.",
                {
                  identity: req.socket.remoteAddress,
                  action: ACTION_AUTH_VERIFY_ERROR,
                  stacktrace: err,
                },
                500
              );
            });
        } catch (err) {
          console.error(err);
          finalizeRequest(
            res,
            "There was a problem trying to parse the body of the request.",
            {
              identity: req.socket.remoteAddress,
              action: ACTION_GENERIC_ERROR,
              stacktrace: err,
            },
            500
          );
        }
      });
    } else if (req.url === "/health" && req.method.toLowerCase() === "get") {
      console.log("Request for health check received.");
      finalizeRequest(res, "Online.", {
        identity: req.socket.remoteAddress,
        action: ACTION_HEALTH_CHECK,
      });
    }
    //region streaming content (i.e. video serving)
    else if (urlPath === "/videos/list" && req.method.toLowerCase() === "get") {
      if (!verifyAuth(req, res, urlParams)) return;

      const files = fs
        .readdirSync(process.env.videoDir, { withFileTypes: true })
        .filter((item) => !item.isDirectory()) //shows will not appear til this line removed
        .map((item) => item.name);

      finalizeRequest(res, files, {
        identity: req.socket.remoteAddress,
        email: decodeURIComponent(urlParams.email),
        action: ACTION_VIDEO_LIST,
      });
    } else if (urlPath === "/videos" && req.method.toLowerCase() === "get") {
      if (!verifyAuth(req, res, urlParams)) return;

      if (!urlParams.fileName) {
        finalizeRequest(
          res,
          "fileName was not provided.",
          {
            identity: req.socket.remoteAddress,
            email: decodeURIComponent(urlParams.email),
            action: ACTION_VIDEO_LIST_NO_FILENAME_ERROR,
          },
          400
        );
        return;
      }

      const videoName = decodeURIComponent(urlParams.fileName);
      const videoPath = process.env.videoDir + videoName;
      const range = req.headers.range;
      

      if (!fs.existsSync(videoPath)) {
        finalizeRequest(
          res,
          "The file does not exist.",
          {
            identity: req.socket.remoteAddress,
            email: decodeURIComponent(urlParams.email),
            action: ACTION_VIDEO_LIST_NO_FILE_ERROR,
          },
          400
        );
        return;
      }

      if (!range) {
        finalizeRequest(
          res,
          "No range header was provided.",
          {
            identity: req.socket.remoteAddress,
            email: decodeURIComponent(urlParams.email),
            action: ACTION_VIDEO_LIST_NO_RANGE_ERROR,
          },
          400
        );
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
      insertUserActivity(
        req.socket.remoteAddress,
        decodeURIComponent(urlParams.email),
        videoName,
        ACTION_VIDEO_LOAD,
        undefined
      );
    }
    //endregion streaming content
    else {
      finalizeRequest(
        res,
        "Page not found.",
        {
          identity: req.socket.remoteAddress,
          action: ACTION_PAGE_NOT_FOUND_ERROR,
          param: urlPath,
        },
        404
      );
    }
  } catch (err) {
    console.error(err);
    finalizeRequest(
      res,
      "An unknown server error occurred.",
      {
        identity: req.socket.remoteAddress,
        action: ACTION_GENERIC_ERROR,
        stacktrace: err,
      },
      500
    );
  }
});

server.listen(PORT, process.env.ip, () => {
  console.log(`Server listening on http://${process.env.ip}:${PORT}/ ...`);
});

const verifyAuth = (req, res, urlParams) => {
  try {
    if (!urlParams.email || !urlParams.token) {
      finalizeRequest(
        res,
        "Must provided an email and token in the request.",
        {
          identity: req.socket.remoteAddress,
          action: ACTION_AUTH_MISSING_PARAMS_ERROR,
        },
        400
      );
      return false;
    }

    const decodedEmail = decodeURIComponent(urlParams.email);
    const decodedToken = decodeURIComponent(urlParams.token);

    if (!verifyToken(decodedToken, decodedEmail)) {
      finalizeRequest(res, "Invalid credentials provided.",       {
        identity: req.socket.remoteAddress,
        action: ACTION_AUTH_INVALID_CREDENTIALS,
        param: urlParams.email
      },
      401);
      return false;
    }
    return true;
  } catch (err) {
    finalizeRequest(
      res,
      "A server error occurred verifying user credentials.",
      {
        identity: req.socket.remoteAddress,
        action: ACTION_GENERIC_ERROR,
        stacktrace: err,
      },
      500
    );
    return false;
  }
};

const setHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.allowedOrigins);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, PUT, POST, DELETE, HEAD, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
};

/**
 * Writes the response back to the client and logs the interaction.
 * @param {*} res HTTP response object.
 * @param {*} content The content to write to errorObject or result
 * @param {{identity:string, action:string, email?:string, param?:string, stacktrace?:string}} logParams An object containing information for logging.
 * @param {*} statusCode Status code. default is 200.
 */
const finalizeRequest = (res, content, logParams, statusCode = 200) => {
  const obj =
    statusCode !== 200
      ? { error: true, errorObject: content }
      : { error: false, result: content };

  const { identity, action, email, param, stacktrace } = logParams;
  insertAction(identity, email, param, action, stacktrace);

  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};
