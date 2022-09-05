const { insertAttempt, getNumberOfAttempts } = require("../../db/attempts");
const { checkAuthorization } = require("../../db/authorization");
const { checkCodeValidity, insertCode } = require("../../db/codes");
const { insertToken } = require("../../db/tokens");
const { generateCode } = require("./util/code-gen");
const { generateToken, decodeToken } = require("./util/crypto");
const { sendMail } = require("./util/mail");
require("dotenv").config({path: `${process.cwd()}/.env`});

const sendCode = async (email) => {
  try {
    const isAuthorized = await checkAuthorization(email);
    if (!isAuthorized){
        console.log("NOT AUTHORIZED")
      return {
        error: true,
        errorObject: `${email} is not authorized to access this server.`,
      };}

    const attempts = await getNumberOfAttempts(email, process.env.attemptsDur);
    if (attempts > process.env.attemptsMaxNum) {
      return {
        error: true,
        errorObject: `You may only make ${process.env.attemptsMaxNum} every ${process.env.attemptsDur} hour. Please try again soon.`,
      };
    }

    const code = generateCode(process.env.verificationCodeLength);

    return sendMail(email, code)
      .then(() => insertAttempt(email))
      .then(() => insertCode(email, code))
      .then(() => ({ error: false }))
      .catch((err) => {
        return {
          error: true,
          errorObject: `There was an error sending the verification email to ${email}.`,
        };
      });
  } catch (err) {
    console.error(err);
    return {
      error: true,
      errorObject: `An error occurred.`,
    };
  }
};

/**
 * Takes in the code sent to the user's email and returns an access token (JWT).
 * @param {*} code
 */
const verifyCode = async (email, code) => {
  return checkCodeValidity(email, code)
    .then((isValid) => {
      if (!isValid) throw new Error(); //code is not present, not from the specified email, or expired
      //code was valid, generate and return a jwt
      return generateToken(email);
    })
    .then(async (token) => {
      await insertToken(
        token,
        email,
        Date.now() + process.env.tokenExpiryHrs * 60 * 60 * 1000
      );
      return token;
    })
    .then((token) => ({ error: false, token }))
    .catch((err) => {
      return {
        error: true,
        errorObject: "The code provided did not grant an access token.",
      };
    });
};

/** Returns true/false as to whether the token is valid. */
const verifyToken = (token, email) => {
  try {
    const decoded = decodeToken(token);
    return decoded.email === email && decoded.exp * 1000 >= Date.now();
  } catch (err) {
    return false;
  }
};

//sendCode("shane.sepac@gmail.com")
//verifyCode("shane.sepac@gmail.com", "zki3AR");

/* console.log(verifyToken("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNoYW5lLnNlcGFjQGdtYWlsLmNvbSIsImlhdCI6MTY1OTE1MDk2NiwiZXhwIjoxNjU5MjM3MzY2fQ.Y1p6rjD1U3seHeEBOuOCzSOzjxMPHkUs7_ZkFOI69dC2sSKHzzFawS5HTLCQLTCU2sWn77oJUlSpiJ-w7PN3DYaXDOnyf9V8jDJqva90PWbwsigo4g7ZGRmZCjRjFPUn7jcbSSZyPe3olmSdHG0V0NXUlCcbRvZUjBTpHXep3wWXypkAN60MwlEli3-rRrmgIncHPalMbt-secUII7Vs27kfh8KGO3gwYR8FBl39NJe8t6EPGuGa_H98y_B8rIgbJS6BZ1KEsluIwi07LwJe0ttOpTDZ2hDM9aeKnfdA4lzYyspasZ9UtfCFdGGIq06P17hZbTEp4Fb2FFIHcKUKAiqHRANgecx5SNKFJdhOwP3AExPjdCsceWKY3xwdjbT_IOHubcnPCrxCYHFRmOo5-NsHz9usBAy5Em8gvwVbZDtIIx-EpmvD97nNa1dSp-TSyh7X82kND4VDpmT2g3GYOPX-D_oJ8LP32OCf8YtXrum60EzWpRc8Q8ijoMrvHhD2Z7ULY5QRcQIW_5ivASpNw8Yo5NjC9HLIO3vA1y5IYa2JJANnGVuCZrA7nacAXoSZxawNesfViCrviPiNKccPKydrDRA3D0GOYqvHjzHAr4CPYCrsvrE7uoZqIMtPhi4OUtYopDSgO_3Mr6kTYzJBsMlSOmoRTwzi2i0QvAUvYQY", "shane.sepac@gmail.com")
) */
module.exports = { sendCode, verifyCode, verifyToken };
