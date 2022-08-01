const { runStatements, get, TABLE_CODES } = require("./db");
require("dotenv").config(); //TODO: add path here

const insertCode = (email, code) => {
  const createTableOptionStmt = {
    stmt: `CREATE TABLE IF NOT EXISTS ${TABLE_CODES} (email TEXT, code TEXT, dateInserted DATE)`,
  };
  const insertStmt = {
    stmt: `INSERT INTO ${TABLE_CODES} VALUES (?, ?, ?)`,
    params: [email, code, Date.now()],
  };

  return runStatements([createTableOptionStmt, insertStmt]);
};

/** Returns true if valid. */
const checkCodeValidity = (email, code) => {
  const validityMins = process.env.codeValidityMins;
  const validityMs = validityMins * 60 * 1000;
  const boundaryMs = Date.now() - validityMs;
  const checkStmt = {
    stmt: `SELECT * FROM ${TABLE_CODES} WHERE email='${email}' AND code='${code}' AND dateInserted >= ${boundaryMs}`,
  };
  return get(checkStmt)
    .then((res) => {
        return !!res
    })
    .catch((err) => {
        return false
    });
};

//insertCode("shane.sepac@gmail.com", 1234)
/*  checkCodeValidity("shane.sepac@gmail.com", "zLW7wf").then((resp) =>
  console.log(resp)
).catch(()=>console.log("token not valid")) */

module.exports = {
  insertCode,
  checkCodeValidity,
};
