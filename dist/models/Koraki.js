let mongoose = require("mongoose");

let korakiSchema = new mongoose.Schema({
    uporabnik: {type : mongoose.Schema.Types.ObjectId, ref : "Uporabnik"},
    druzina: {type:String, required: true},
    koraki: [{type : mongoose.Schema.Types.ObjectId, ref : "Uporabnik"}]
});

mongoose.model('Koraki', korakiaSchema, 'Koraki');