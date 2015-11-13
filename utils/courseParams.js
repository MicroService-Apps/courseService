/*
 * parameters data structure for course
 */

// Constructor
function CourseParams(cid, name, instructor, student, operation) {
    // always initialize all instance properties
    this.cid = cid;
    this.name = name;
    this.instructor = instructor;
    this.student = student;
    this.operation = operation;
    this.oldParam = null;
}

// get cid
CourseParams.prototype.getCid = function() {
    return this.cid;
};

// get name
CourseParams.prototype.getName = function() {
    return this.name;
};

// get instructor
CourseParams.prototype.getInstructor = function() {
    return this.instructor;
};

// get student
CourseParams.prototype.getStudent = function() {
    return this.student;
};

// get operation
CourseParams.prototype.getOperation = function() {
    return this.operation;
};

// get history
CourseParams.prototype.getHistory = function() {
    return this.oldParam;
};

// change operation
CourseParams.prototype.addOperation = function(operation) {
    this.operation = operation;
};

// add history
CourseParams.prototype.addHistory = function(params) {
    this.oldParam = params;
};

// set name
CourseParams.prototype.setName = function(name) {
    this.name = name;
};

// set instructor
CourseParams.prototype.setInstructor = function(instructor) {
    this.instructor = instructor;
};

// export the class
module.exports = CourseParams;