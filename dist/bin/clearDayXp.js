#!/app/bin/env node

function logMessage() {
  console.log('GONG! An hour has passed and herokuCron.js has activated');
}
logMessage();


/*
let mongoose = require('mongoose');
let Uporabnik = mongoose.model("Uporabnik");

console.log("deleting daily xp");
deleteXp();

function deleteXp() {
    Uporabnik.where().updateMany({ $set: { "dayXp": 0 } }, function (err, res) {
    if (err) {
        console.log(err);
    } else { console.log(res); }
    console.log("finished");
    });
    console.log("finished");
}*/
