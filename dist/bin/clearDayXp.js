#!/app/bin/env node

let mongoose = require('mongoose');
let Uporabnik = mongoose.model("Uporabnik");

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
