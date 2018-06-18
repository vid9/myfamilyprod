#!/app/bin/env node

let  mongo = require('mongodb');

console.log("Deleting daily xp");

mongo.connect(process.env.MONGOLAB_URI, {}, function(error, db){
    db.addListener("error", function(error){
      console.log("Error connecting to MongoLab");
    });
    db.Uporabnik.updateMany({ $set: { "dayXp": 0 } }, function (err, res) {
        if (err) {
            console.log(err);
        } else { console.log(res); }
        console.log("Daily xp deleted");
    });
  });