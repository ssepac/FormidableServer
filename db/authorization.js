const { runStatements, get, TABLE_USERS } = require("./db");

const insertEmail = (email) => {
  const createTableOptionStmt = {
    stmt: `CREATE TABLE IF NOT EXISTS ${TABLE_USERS} (email TEXT, dateInserted DATE)`,
  };
  const insertStmt = {
    stmt: `INSERT INTO ${TABLE_USERS} VALUES (?, ?)`,
    params: [email, Date.now()],
  };

  return runStatements([createTableOptionStmt, insertStmt]);
};

/** Returns true if authorized. */
const checkAuthorization = (email) => {
  const checkStmt = {
    stmt: `SELECT * FROM ${TABLE_USERS} WHERE email='${email}'`,
  };
  return get(checkStmt)
    .then((res) => {
      return !!res;
    })
    .catch((err) => {
      return false;
    });
};

module.exports = {
  insertEmail,
  checkAuthorization,
};
