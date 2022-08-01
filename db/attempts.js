const { runStatements, get, TABLE_ATTEMPTS } = require("./db");

const insertAttempt = (email) => {
  const createTableOptionStmt = {
    stmt: `CREATE TABLE IF NOT EXISTS ${TABLE_ATTEMPTS} (email TEXT, dateInserted DATE)`,
  };
  const insertStmt = {
    stmt: `INSERT INTO ${TABLE_ATTEMPTS} VALUES (?, ?)`,
    params: [email, Date.now()],
  };

  return runStatements([createTableOptionStmt, insertStmt]);
};

/** Gets the number of attempts since the last hrsPrev hours. */
const getNumberOfAttempts = (email, hrsPrev) => {
  const msPrev = hrsPrev * 60 * 60 * 1000;
  const boundaryMs = Date.now() - msPrev;
  const getAttemptsStmt = {
    stmt: `SELECT COUNT(*) as cnt, dateInserted FROM ${TABLE_ATTEMPTS} WHERE email='${email}' AND dateInserted >= ${boundaryMs}`,
  };

  return get(getAttemptsStmt)
    .then((res) => {
      return res.cnt;
    })
    .catch((err) => {
      if (err.errno === 1) return 0; //table does not exist
      return -1;
    });
};

module.exports = {
  insertAttempt,
  getNumberOfAttempts,
};
