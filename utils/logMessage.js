/*
 * This file define the method for logging
 */

var path = require('path');
var fs = require('fs');

// define operations
exports.ADD_COURSE = "add a new course";
exports.READ_COURSE = "read an existing course";
exports.DELETE_COURSE = "delete an existing course";
exports.UPDATE_COURSE = "update an existing course";
exports.ADD_STUDENT_INTO_COURSE = "add a student into a course";
exports.DELETE_STUDENT_FROM_COURSE = "delete a student from a course";
exports.ADD_FIELD = "add a new field";
exports.DELETE_FIELD = "delete a new field";

// log message depending on different service
exports.logMsg = function(string, service){
    var logPath = path.join(path.dirname(__dirname),'log/' + service + '.log');

    fs.appendFile(logPath, string, function (err) {
        if (err) throw err;
    });
};
