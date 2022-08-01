const {
  insertUserActivity: dbInsertUserActivity,
} = require("../../db/logging");

// unauthenticated actions
const ACTION_AUTH = "ACTION_AUTH";
const ACTION_AUTH_CHECK = "ACTION_AUTH_CHECK";
const ACTION_AUTH_VERIFY_CODE = "ACTION_AUTH_VERIFY_CODE"
const ACTION_AUTH_VERIFY_ERROR = "ACTION_AUTH_VERIFY_ERROR"
const ACTION_PRE_FLIGHT = "ACTION_PRE_FLIGHT"
const ACTION_HEALTH_CHECK = "ACTION_HEALTH_CHECK"

// unauthenticated errors
const ACTION_AUTH_MISSING_PARAMS_ERROR = "ACTION_AUTH_MISSING_PARAMS_ERROR"
const ACTION_AUTH_SEND_CODE_ERROR = "ACTION_AUTH_SEND_CODE_ERROR"
const ACTION_GENERIC_ERROR = "ACTION_GENERIC_ERROR"
const ACTION_PAGE_NOT_FOUND_ERROR = "ACTION_PAGE_NOT_FOUND_ERROR"

//authenticated actions
const ACTION_VIDEO_LIST = "ACTION_VIDEO_LIST";
const ACTION_VIDEO_LOAD = "ACTION_VIDEO_LOAD";

//authenticated error
const ACTION_VIDEO_LIST_NO_FILENAME_ERROR = "ACTION_VIDEO_LIST_NO_FILENAME_ERROR"
const ACTION_VIDEO_LIST_NO_FILE_ERROR = "ACTION_VIDEO_LIST_NO_FILE_ERROR"
const ACTION_VIDEO_LIST_NO_RANGE_ERROR = "ACTION_VIDEO_LIST_NO_RANGE_ERROR"

const insertActionToString = (identity, email, param, action, stacktrace) =>
  [
    `identity: ${identity}`,
    `email: ${email}`,
    `param: ${param}`,
    `action: ${action}`,
    `trace: ${stacktrace}`,
  ].join("\n");

const insertAction = (identity, email, param, action, stacktrace) => {
  dbInsertUserActivity(identity, email, param, action, stacktrace).catch(
    (err) =>
      console.error(
        "An error occurred trying to log the following:",
        insertActionToString(identity, email, param, action, stacktrace),
        err
      )
  );
};

module.exports = {
    insertAction,
    ACTION_AUTH,
    ACTION_AUTH_MISSING_PARAMS_ERROR,
    ACTION_AUTH_VERIFY_ERROR,
    ACTION_AUTH_SEND_CODE_ERROR,
    ACTION_GENERIC_ERROR,
    ACTION_AUTH_CHECK,
    ACTION_AUTH_VERIFY_CODE,
    ACTION_VIDEO_LIST,
    ACTION_VIDEO_LIST_NO_FILENAME_ERROR,
    ACTION_VIDEO_LIST_NO_FILE_ERROR,
    ACTION_VIDEO_LIST_NO_RANGE_ERROR,
    ACTION_VIDEO_LOAD,
    ACTION_PRE_FLIGHT,
    ACTION_HEALTH_CHECK,
    ACTION_PAGE_NOT_FOUND_ERROR
}