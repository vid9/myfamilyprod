#!/app/bin/env node

let  mongo = require('mongodb');

console.log("Deleting daily xp");

mongo.connect(process.env.DB_url, {}, function(error, db){
    if (error) {
        console.log(error);
    }
    console.log(db);
    db.Uporabnik.updateMany({ $set: { "dayXp": 0 } }, function (err, res) {
        if (err) {
            console.log(err);
        } else { console.log(res); }
        console.log("Daily xp deleted");
    });
  });