const sqlite3 = require("sqlite3").verbose();
const dbPath = "./db/db.db"; //TODO: Update this
const db = new sqlite3.Database(dbPath);

const TABLE_USERS = "USERS";
const TABLE_ATTEMPTS = "ATTEMPTS";
const TABLE_CODES = "CODES";
const TABLE_TOKENS = "TOKENS";
const TABLE_LOGGING = "LOGGING_BROAD"
const TABLE_USER_ACTIVITY = "LOGGING_USER_ACTIVITY"

const createDb = async () =>
  new sqlite3.Database(dbPath, (err) => {
    if (err) {
      throw err;
    }
    return db;
  });

const runStatements = async (stmts) =>
  createDb()
    .then((db) => {
      db.serialize(() => {
        stmts.forEach(({ stmt, params }) => db.run(stmt, params));
      });
      db.close();
    })
    .catch((err) => console.error(err));

const get = ({ stmt }) =>
  createDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        db.get(stmt, (err, res) => {
          db.close();
          if (err) reject(err);
          resolve(res);
        });
      })
  );

module.exports = {
  TABLE_ATTEMPTS,
  TABLE_CODES,
  TABLE_TOKENS,
  TABLE_USERS,
  TABLE_LOGGING,
  TABLE_USER_ACTIVITY,
  runStatements,
  get,
};
