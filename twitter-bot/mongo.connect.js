(function() {
  //This class handles connecting to mongodb with mongoose
  var mongoose = require('mongoose');
  var Chalk = require("Chalk");

  const mongooseLabel = Chalk.yellow("Mongoose:");
  const errorLabel = Chalk.red("Error:");
  const successLabel = Chalk.green("Success:");

  //Config load in
  var config = require('./config');

  //connect to mongo
  mongoose.Promise = global.Promise; //set promise library
  var mongoString = "mongodb://";
  if (config.db.user && config.db.pwd) {
    // On production add in username and password
    console.log(mongooseLabel, successLabel, "in PRODUCTION");
    mongoString = mongoString + config.db.user + ":" + config.db.pwd + "@";
  } else {
    console.log(mongooseLabel, successLabel, "Localhost");
  }
  mongoString = mongoString + config.db.host + ":" + config.db.port + "/" + config.db.database;

  module.exports = new Promise(function(resolve, reject) {
    mongoose.connect(mongoString, function(err) {
      if (err) {
        console.log(errorLabel, mongooseLabel, err);
        reject(err);
      } else {
        console.log(mongooseLabel, "Mongo connected...");
        resolve();
      }
    });
  });
}());