const { runStatements, get, TABLE_TOKENS } = require("./db");

const insertToken = (token, email, expiration) => {
  const createTableOptionStmt = {
    stmt: `CREATE TABLE IF NOT EXISTS ${TABLE_TOKENS} (token TEXT, email TEXT, expiration DATE, dateInserted DATE)`,
  };
  const insertStmt = {
    stmt: `INSERT INTO ${TABLE_TOKENS} VALUES (?, ?, ?, ?)`,
    params: [token, email, expiration, Date.now()],
  };

  return runStatements([createTableOptionStmt, insertStmt]);
};

/** Gets the number of attempts since the last hrsPrev hours. */
const isTokenActive = (token, expiration) => {
  const now = Date.now();
  const getTokenStmt = {
    stmt: `SELECT COUNT(*) as cnt FROM ${TABLE_TOKENS} WHERE token='${token}' AND ${expiration} >= ${now}`,
  };

  return get(getTokenStmt)
    .then(({ cnt }) => cnt > 0)
    .catch((err) => {
      return false;
    });
};
/* 
insertToken(
  "shane.sepac@gmail.com",
  "sdfgsdfg45gsrg",
  Date.now() - 1000 * 60 * 60
); */
//isTokenActive("shane.sepac@gmail.com", Date.now() + 1000).then((res) => console.log(res));

module.exports = {
  insertToken,
  isTokenActive,
};
