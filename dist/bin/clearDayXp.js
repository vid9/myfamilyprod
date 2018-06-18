#!/app/bin/env node

let mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, function (error) {
    if (error) console.error(error);
    else console.log('mongo connected');
});

require("../models/Uporabnik");
let Uporabnik = mongoose.model("../models/Uporabnik");

console.log("Deleting daily xp");
deleteXp();

function deleteXp() {
    Uporabnik.where().updateMany({ $set: { "dayXp": 0 } }, function (err, res) {
    if (err) {
        console.log(err);
    } else { console.log(res); }
    console.log("Daily xp deleted");
    });
}
