const { runStatements, TABLE_USER_ACTIVITY } = require("./db");


//identity (ip), action, stacktrace (NULLABLE), time
const insertUserActivity = (identity, email, param, action, trace) => {
    const createTableOptionStmt = {
      stmt: `CREATE TABLE IF NOT EXISTS ${TABLE_USER_ACTIVITY} (identity TEXT, email TEXT, param TEXT, action TEXT, stacktrace TEXT, dateInserted DATE)`,
    };
    const insertStmt = {
      stmt: `INSERT INTO ${TABLE_USER_ACTIVITY} VALUES (?, ?, ?, ?, ?, ?)`,
      params: [identity, email, param, action, trace, Date.now()],
    };
  
    return runStatements([createTableOptionStmt, insertStmt]);
  };

  //insertUserActivity("SELF", "bob.johnson@gmail.com", "sdf34fweff", "TEST_ACTION", null)

module.exports = {
    insertUserActivity
};
