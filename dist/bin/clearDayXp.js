#!/app/bin/env node

require( '../models/db' );
var mongoose = require( 'mongoose' );
let Uporabnik = mongoose.model("Uporabnik");

console.log("Deleting daily xp");

Uporabnik.where().updateMany({ $set: { "dayXp": 0 } }, function (err, res) {
    if (err) {
        console.log(err);
    } else { console.log(res); }
    console.log("Daily xp deleted");
    });



/*
let  mongo = require('mongodb');

console.log("Deleting daily xp");

mongo.connect(process.env.DB_url, function(error, db){
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
  });*/