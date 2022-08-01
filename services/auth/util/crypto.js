require("dotenv").config(); //TODO: add path here
const jwt = require('jsonwebtoken')
const fs = require('fs')

/** Returns token */
const generateToken = (email) => {
    var privateKey = fs.readFileSync(process.env.tokenKeyDir);
    return jwt.sign({ email }, privateKey, { algorithm: 'RS256', expiresIn: "24h"});
}

/** Returns an object with email, iat, and exp fields. NOTE: The units of exp are seconds, which likely needs a conversion to ms.*/
const decodeToken = (token) => {
    var pem = fs.readFileSync(process.env.tokenPemDir);
    return jwt.decode(token, pem); //i.e. { foo: 'bar', iat: 1659144705, exp: 1659231105 }
}

module.exports = {
    generateToken,
    decodeToken
}