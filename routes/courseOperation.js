/*
 * This file is for action in course service, including CRUD
 */

var qs = require('querystring');
var lr = require("line-reader");
var path = require('path');
var async = require('async');
var db = require('./../utils/mongo.js');
var log = require('./../utils/logMessage');
var CourseParams = require('./../utils/courseParams');

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
        var post = qs.parse(body);
        var name = post['name'];
        var instructor = post['instructor'];
        var studentsEnrolled = post['studentsEnrolled'];
        var params = new CourseParams(cid, name, instructor, studentsEnrolled, log.ADD_COURSE);

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
    var cid = req.params.cid;
    var params = new CourseParams(cid, null, null, null, log.DELETE_COURSE);

    // get mongoDB collection
    var course = db.collection(serviceType);

    console.log(params);
    deleteCourse(res, params, course);
};

// handle read course information
exports.readCourse = function(req, res) {
    // define parameters
    var cid = req.params.cid;
    var params = new CourseParams(cid, null, null, null, log.READ_COURSE);

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
        var post = qs.parse(body);
        var name = post['name'];
        var instructor = post['instructor'];
        var params = new CourseParams(cid, name, instructor, null, log.UPDATE_COURSE);

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
    var params = new CourseParams(cid, null, null, student, log.DELETE_STUDENT_FROM_COURSE);

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
    var params = new CourseParams(cid, null, null, student, log.ADD_STUDENT_INTO_COURSE);

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
            var params = new CourseParams(history.cid, history.name, history.instructor, history.student, null);

            params.addHistory(history.oldParam);

            // get mongoDB collection
            var course = db.collection(serviceType);

            switch(operation) {
                case log.ADD_COURSE:
                    // revert add course
                    params.addOperation(log.DELETE_COURSE);
                    deleteCourse(res, params, course);

                    break;
                case log.DELETE_COURSE:
                    // revert delete course
                    params.addOperation(log.ADD_COURSE);
                    insertCourse(res, params, course);

                    break;
                case log.UPDATE_COURSE:
                    // revert update
                    var history = params.getHistory();
                    var oldParams = new CourseParams(history.cid, history.name, history.instructor);
                    updateCourse(res, oldParams, course);

                    break;
                case log.ADD_STUDENT_INTO_COURSE:
                    // revert add student to course list
                    params.addOperation(log.DELETE_STUDENT_FROM_COURSE);
                    deleteStudent(res, params, course);

                    break;
                case log.DELETE_STUDENT_FROM_COURSE:
                    // revert delete student from course list
                    console.log(params);

                    params.addOperation(log.ADD_STUDENT_INTO_COURSE);
                    insertStudent(res, params, course);

                    break;
                default:
                    break;
            }
        }
    });
};

// handle configuration
exports.config = function(req, res) {
    // to do: configure schema
};

// function: insert a course entry
function insertCourse(res, params, course) {
    // define response object
    var response = new Object();

    // insert new course into db
    course.count({cid: params.getCid()}, function(err, count) {
        if(count==0){
            // no conflicts

            var name = params.getName();
            var cid = params.getCid();
            var instructor = params.getInstructor();
            var students = params.getStudent().split(",");

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

    if(params.getCid() == "#") {
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

        course.count({cid: params.getCid()}, function (err, count) {
            if (count > 0) {
                course.find({cid: params.getCid()}).toArray(function (err, result) {
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
    var cid = params.getCid();

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
                    params.name = result["name"];
                    params.cid = result["cid"];
                    params.instructor = result["instructor"];
                    params.student = result["studentsEnrolled"].join();

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
    var cid = params.getCid();
    var oldStudent = params.getStudent();

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
    var cid = params.getCid();
    var name = params.getName();
    var instructor = params.getInstructor();

    course.findOne({cid: cid}, function (err, oldEntry) {
        var response = new Object();

        if (err) {
            response.status = "failed";
            response.message = err.toSring();

            res.send(response);
            return;
        }

        if (oldEntry) {
            async.parallel([
                //update name
                function (callback) {
                    // check if name exists
                    if(name == null || name == '') {
                        callback(null, null);
                        return;
                    }

                    course.update({cid: cid}, {'$set': {name: name}}, function (err, r) {
                        if (err) {
                            response.status = "failed";
                            response.message = err.toSring();

                            callback(null, response);
                        } else {
                            response.status = "succeed";
                            response.message = "course " + cid + "'s name has been changed to " + name;

                            callback(null, response);
                        }
                    });
                },

                //update instructor
                function (callback) {
                    // check if instructor exists
                    if(instructor == null || instructor == '') {
                        callback(null, null);
                        return;
                    }

                    course.update({cid: cid},{'$set':{instructor: instructor}},function(err,r){
                        if(err){
                            response.status = "failed";
                            response.message = err.toSring();

                            callback(null, response);
                        } else {
                            response.status = "succeed";
                            response.message = "course "+cid+"'s instructor has been changed to "+instructor;

                            callback(null, response);
                        }
                    });
                }],

                // handle response and log
                function (err, results) {
                    if (err) {
                        response.status = "failed";
                        response.message = err.toSring();

                        return res.send(response);
                    }

                    if(results) {
                        var resString = "";
                        var oldParams = new CourseParams(cid, oldEntry['name'], oldEntry['instructor'], null, null);
                        params.addHistory(oldParams);

                        if(results[0]) {
                            resString += JSON.stringify(results[0]);
                        }

                        if(results[1]) {
                            resString += JSON.stringify(results[1]);
                        }

                        log.logMsg(JSON.stringify(params)+'\n', serviceType);
                        res.send(resString);
                    }
                });
        } else {
            response.status = "failed";
            response.message = "Cid " + cid + " does not exist.";

            res.send(response);
        }
    });
}