const { runStatements } = require("./db.js");

runStatements([
  {
    stmt: `CREATE TABLE IF NOT EXISTS ${TABLE_USERS} (email TEXT, dateInserted DATE)`,
  },
  {
    stmt: `INSERT INTO ${TABLE_USERS} VALUES (?, ?)`,
    params: ["my.email@gmail.com", new Date()],
  },
  { stmt: `DROP TABLE ${TABLE_USERS}` },
]);
