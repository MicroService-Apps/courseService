/*
 * This file is for action in course service, including CRUD
 */

var qs = require('querystring');
var lr = require("line-reader");
var path = require('path');
var db = require('./../utils/mongo.js');
var log = require('./../utils/logMessage');

var serviceType = 'course';

// handle create a new course
exports.createCourse = function(req, res) {
    // get content from body
    var body = '';
    var cid = req.params.cid;

    req.on('data', function (data) {
        body += data;

        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6)
            request.connection.destroy();
    });

    // handle operations
    req.on('end', function () {
        // get parameters
        var params = qs.parse(body);
        params.cid = cid;
        params.student = [];
        params.operation = log.ADD_COURSE;

        console.log(params);

        // get mongoDB collection
        var course = db.collection(serviceType);

        // create new course
        insertCourse(res, params, course);
    });
};

// handle delete an existing course
exports.deleteCourse = function(req, res) {
    // define parameters
    var params = new Object();
    params.cid = req.params.cid;
    params.operation = log.DELETE_COURSE;

    // get mongoDB collection
    var course = db.collection(serviceType);

    console.log(params);
    deleteCourse(res, params, course);
};

// handle read course information
exports.readCourse = function(req, res) {
    // define parameters
    var params = new Object();
    params.cid = req.params.cid;
    params.operation = log.READ_COURSE;

    // get mongoDB collection
    var course = db.collection(serviceType);

    console.log(params);
    getCourse(res, params, course);
};

// handle update course information
exports.updateCourse = function(req, res) {
    // get content from body
    var body = '';
    var cid = req.params.cid;

    req.on('data', function (data) {
        body += data;

        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6)
            request.connection.destroy();
    });

    // handle operations
    req.on('end', function () {
        // get parameters
        var params = qs.parse(body);
        params.cid = cid;
        params.operation = log.UPDATE_COURSE;

        console.log(params);

        // get mongoDB collection
        var course = db.collection(serviceType);

        // create new course
        updateCourse(res, params, course);
    });
};

// handle delete student in student list
exports.deleteStudent = function(req, res) {
    // get parameters
    var cid = req.params.cid;
    var student = req.params.uni;

    var params = new Object();
    params.cid = cid;
    params.student = student;
    params.operation = log.DELETE_STUDENT_FROM_COURSE;

    console.log(params);

    // get mongoDB collection
    var course = db.collection(serviceType);

    // create new course
    deleteStudent(res, params, course);
};

// handle add student in student list
exports.addStudent = function(req, res) {
    // get parameters
    var cid = req.params.cid;
    var student = req.params.uni;
    var params = new Object();
    params.cid = cid;
    params.student = student;
    params.operation = log.ADD_STUDENT_INTO_COURSE;

    console.log(params);

    // get mongoDB collection
    var course = db.collection(serviceType);

    // create new course
    insertStudent(res, params, course);
};

// handle revert the last operation
exports.revert = function(req, res) {
    var file = 'log/' + serviceType + '.log';

    lr.eachLine(path.join(path.dirname(__dirname), file), function(line, last) {
        if (last) {
            console.log(line);

            // handle revert
            var history = JSON.parse(line);
            var operation = history.operation;
            var params = history;

            // get mongoDB collection
            var course = db.collection(serviceType);

            switch(operation) {
                case log.ADD_COURSE:
                    // revert add course
                    params.operation = log.DELETE_COURSE;
                    deleteCourse(res, params, course);

                    break;
                case log.DELETE_COURSE:
                    // revert delete course
                    params.operation = log.ADD_COURSE;
                    insertCourse(res, params, course);

                    break;
                case log.UPDATE_COURSE:
                    // revert update
                    updateCourse(res, history.oldParam, course);

                    break;
                case log.ADD_STUDENT_INTO_COURSE:
                    // revert add student to course list
                    params.operation = log.DELETE_STUDENT_FROM_COURSE;
                    deleteStudent(res, params, course);

                    break;
                case log.DELETE_STUDENT_FROM_COURSE:
                    // revert delete student from course list
                    console.log(params);

                    params.operation = log.ADD_STUDENT_INTO_COURSE;
                    insertStudent(res, params, course);

                    break;
                default:
                    break;
            }
        }
    });
};

// handle configuration
exports.addField = function(req, res) {
    // get parameters
    var field = req.params.field;
    var fieldParams = new Object();
    fieldParams[field]="";

    var logParam = new Object();
    logParam.operation = log.ADD_FIELD;
    logParam.field = field;

    // get mongoDB collection
    var course = db.collection(serviceType);

    //add new field
    var response = new Object();
    course.update({},{$set: fieldParams },{multi:true}, function (err,result) {
        if (err) { // error situation
            response.status = "failed";
            response.message = err.toSring();
            res.send(response);

            return;
        }

        if(result){
            response.status = "succeed";
            response.message = "field: "+ field + " has been added";

            // log operation
            log.logMsg(JSON.stringify(logParam)+"\n", serviceType);

            // send back message
            res.send(response);
        }
    });
};

// function: insert a course entry
function insertCourse(res, params, course) {
    // define response object
    var response = new Object();

    // insert new course into db
    course.count({cid: params.cid}, function(err, count) {
        if(count==0){
            // no conflicts

            var name = params.name;
            var cid = params.cid;
            var instructor = params.instructor;
            var students = params.student;

            course.insert({name: name, cid: cid, instructor: instructor,studentsEnrolled: students},
                function(err, result) {
                    if (err) { // error situation
                        response.status = "failed";
                        response.message = err.toSring();

                        res.send(response);

                        return;
                    }

                    if (result){ // normal situation
                        response.status = "succeed";
                        response.message = "course ["+ cid + "] " + name +" added";

                        // log operation
                        log.logMsg(JSON.stringify(params)+"\n", serviceType);

                        // send back message
                        res.send(response);
                    }});
        } else{ // exist conflicts
            response.status = "failed";
            response.message = "Cid existed";
            // send back message
            res.send(response);
        }
    });
}

// function: get course information
function getCourse(res, params, course) {
    // define response
    var response = new Object();

    if(params.cid == "all") {
        // get all cids
        course.find({}, {cid: true}).toArray(function(err, results) {
            if(err) {
                response.status = "failed";
                response.message = err.toSring();
            } else {
                response.status = "succeed";
                response.message = "list all courses cid";
                response.body = results;
            }

            // log operation
            log.logMsg(JSON.stringify(params) + "\n");
            // send back message
            res.send(response);
        });
    } else {
        // get information according to cid

        course.count({cid: params.cid}, function (err, count) {
            if (count > 0) {
                course.find({cid: params.cid}).toArray(function (err, result) {
                    if (err) {
                        response.status = "failed";
                        response.message = err.toSring();
                        res.send(response);
                    }
                    else {
                        response.status = "succeed";
                        response.message = count + " Course found";
                        response.body = result;
                        // log history
                        log.logMsg(JSON.stringify(params) + "\n", serviceType);
                        // send back response
                        res.send(response);
                    }
                });
            } else {
                response.status = "failed";
                response.message = "no course match your request";
                // log history
                log.logMsg(JSON.stringify(params) + "\n", serviceType);
                // send back response
                res.send(response)
            }
        });
    }
}

// function: delete an existing course
function deleteCourse(res, params, course) {
    var response = new Object();
    var cid = params.cid;

    course.findOne({cid: cid}, function(err, result) {
        if(result){
            course.remove({cid: cid},function(err, r) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();

                    return;
                }
                else{
                    // add history into parameters
                    var tmp = new Object();
                    params.name = result.name;
                    params.cid = result.cid;
                    params.instructor = result.instructor;

                    response.status = "succeed";
                    response.message = "course "+ cid +" removed";
                    // log history
                    log.logMsg(JSON.stringify(params)+"\n", serviceType);
                }
                // send back response
                res.send(response);
            });
        }
        else{
            response.status = "failed";
            response.message = "no course match your request";
            // send back response
            res.send(response);
        }
    });
}

// function: insert student into course list
function insertStudent(res, params, course) {
    var response = new Object();
    var cid = params.cid;

    course.findOne({cid: cid}, function(err, result) {
        if (err) { // handling error
            response.status = "failed";
            response.message = err.toSring();
            res.send(response);

            return;
        }

        if(result) { // find record
            var newStudent = params.student;
            var studentList = result.studentsEnrolled;

            if(studentList.indexOf(newStudent) == -1) {
                studentList.push(newStudent);

                course.update({cid: cid},{'$set':{studentsEnrolled: studentList}},function(err,result){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        res.send(response);

                        return;
                    }

                    if(result){
                        response.status = "succeed";
                        response.message = "student " + newStudent + " is added to course(cid:" + cid + ").";

                        // log history
                        log.logMsg(JSON.stringify(params)+"\n", serviceType);

                        res.send(response);
                    }
                });
            } else {
                response.status = "failed";
                response.message = "student already enroll course(cid:" + cid + ").";
                res.send(response);
            }
        } else{ // no record
            response.status = "failed";
            response.message = "Cid "+ cid +" does not exist.";
            res.send(response);
        }
    });
}

// function: delete student from course list
function deleteStudent(res, params, course) {
    var response = new Object();
    var cid = params.cid;
    var oldStudent = params.student;

    // check if need to delete student in all courses ?
    if(cid == 'all') {
        course.find({studentsEnrolled: oldStudent}).toArray(function(err,result) {
            if(err){
                response.status = "failed";
                response.message = err.toSring();
                res.send(response);

                return;
            }

            if(result.length > 0){
                var count = 0;

                result.forEach(function(resultCourse){
                    var studentArr = resultCourse.studentsEnrolled;

                    studentArr.splice(studentArr.indexOf(oldStudent),1);
                    course.update({cid: resultCourse["cid"]},{'$set':{studentsEnrolled: studentArr}},function(err,r){
                        if(!err) {
                            count++;
                            if(count == result.length){
                                response.status = "succeed";
                                response.message = "Student " + oldStudent + " is deleted and deleted from all Courses.";
                                log.logMsg(JSON.stringify(params)+"\n", serviceType);

                                res.send(response);
                            }
                        }
                    });
                });
            } else{
                response.status = "succeed";
                response.message = "No course is enrolled by student "+ oldStudent;

                res.send(response);
            }
        });

        return;
    }

    course.findOne({cid: cid}, function(err, result) {
        if (err) { // handling error
            response.status = "failed";
            response.message = err.toSring();
            res.send(response);

            return;
        }

        if(result) { // find record
            var studentList = result.studentsEnrolled;

            if(studentList.indexOf(oldStudent) != -1) {
                studentList.splice(studentList.indexOf(oldStudent),1);

                course.update({cid: cid},{'$set':{studentsEnrolled: studentList}},function(err,result){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        res.send(response);

                        return;
                    }

                    if(result){
                        response.status = "succeed";
                        response.message = "student " + oldStudent + " is deleted from course(cid:" + cid + ").";

                        // log history
                        log.logMsg(JSON.stringify(params)+"\n", serviceType);

                        res.send(response);
                    }
                });
            } else {
                response.status = "failed";
                response.message = "student is not enrolled in course(cid:" + cid + ").";
                res.send(response);
            }
        } else{ // no record
            response.status = "failed";
            response.message = "Cid "+ cid +" does not exist.";
            res.send(response);
        }
    });
}

// function: update course
function updateCourse(res, params, course) {
    var cid = params.cid;
    var fieldParams = new Object();

    // build query
    for(var key in params) {
        if(key != 'cid' && key != 'operation' && key != 'oldParam' && key != 'student') {
            fieldParams[key] = params[key];
        }
    }

    course.findOne({cid: cid}, function (err, oldEntry) {
        var response = new Object();

        if (err) {
            response.status = "failed";
            response.message = err.toSring();

            res.send(response);
            return;
        }

        if (oldEntry) {
            course.update({cid: cid}, {'$set': fieldParams}, function (err, r) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();
                } else {
                    response.status = "succeed";
                    response.message = "course " + cid + " has been updated";

                    var oldParams = new Object();
                    for(var key in params) {
                        oldParams[key] = oldEntry[key];
                    }

                    params.oldParam = oldParams;
                    log.logMsg(JSON.stringify(params)+'\n', serviceType);
                }

                res.send(response);
            });
        } else {
            response.status = "failed";
            response.message = "Cid " + cid + " does not exist.";

            res.send(response);
        }
    });
}