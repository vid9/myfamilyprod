#!/app/bin/env node

require( '../models/db' );

var mongoose = require( 'mongoose' );
let Uporabnik = mongoose.model("Uporabnik");
let moment = require('moment');
let latinize = require('latinize');
let SMSAPI = require('smsapicom'),smsapi = new SMSAPI({
    oauth: {
        accessToken: process.env.SMSAPI_token
    }
});

let nodemailer = require('nodemailer');
let sparkPostTransport = require('nodemailer-sparkpost-transport')
let transporter = nodemailer.createTransport(sparkPostTransport({
  'sparkPostApiKey': process.env.SPARKPOST_API_KEY
}))

console.log("Sending daily SMS");
sendSMS();
console.log("Daily SMS sent");

console.log("Sending daily emails");
sendMail();
console.log("Daily emails sent");


// SEND DAILY SMS
function sendSMS() {
    Uporabnik.find({ notf_telefon: true }, function (err, smsusers) {
        if (err) {
            console.log(error);
            return;
        }
        for(let j = 0; j < smsusers.length; j++) {
            Naloge.find({ vezani_uporabniki: smsusers[j]._id }, function (err, naloga) {
                if (err) {
                    console.log(err);
                    return;
                }
                let temp = [];
                if (naloga.length == 0) {
                } else {
                    for (let i = 0; i < naloga.length; i++) {
                        let zac = moment(naloga[i].zacetek).format('MM-DD-YYYY');
                        let kon = moment(naloga[i].konec).format('MM-DD-YYYY');
                        let now = moment(Date.now()).format('MM-DD-YYYY');
                        if (dateCheck(zac,kon,now) && naloga[i].status == false) { // Če naloga neopravljena jo dodaj med opomnike
                            temp.push({
                                ime: naloga[i].ime,
                                opis: naloga[i].opis,
                                zacetek: naloga[i].zacetek,
                                konec: naloga[i].konec,
                                xp: naloga[i].xp,
                            });
                        }
                    }
                    if (temp) {                           
                        let vsebina = 'Opomniki za nedokoncane naloge:\n\n';
                        for (let m=0;m<temp.length;m++) {
                            vsebina += "Ime: "+temp[m].ime+"\nOpis: "+temp[m].opis+"\nZacetek: "+moment(temp[m].zacetek).format("D. M ob H:m")+
                            "\nKonec: "+moment(temp[m].konec).format("D. M ob H:m")+"\nTočk: "+temp[m].xp+"\n\n";
                        }
                        sendMessage(smsusers[j].telefon, latinize(vsebina))
                        .then(displayResult)
                        .catch(displayError);
                    }
                }
            });
        }
    });
}

//EMAIL
function sendMail() {
    console.log("Sending daily notifications!")
    Uporabnik.find({ notf_email: true }, function (err, emailusers) {
        if (err) {
            console.log(error);
            return;
        }
        for(let j = 0; j < emailusers.length; j++) {
            console.log("sending to user"+emailusers[j].email);
            Naloge.find({ vezani_uporabniki: emailusers[j]._id }, function (err, naloga) {
                if (err) {
                    throw err;
                }
                let idx = {};
                if (naloga.length == 0) {
                } else {
                    for (let i = 0; i < naloga.length; i++) {
                        let zac = moment(naloga[i].zacetek).format('MM-DD-YYYY');
                        //let kon = moment(naloga[i].konec).format('MM-DD-YYYY');
                        let now = moment(Date.now()).format('MM-DD-YYYY');
                        if (zac && naloga[i].status == false) { // Če je naloga na današnji dan jo dodaj v opomnike
                            //console.log(zac, now, moment.duration(moment(zac).diff(moment(now))));
                            idx[Math.abs(moment.duration(moment(zac).diff(moment(now))))] = naloga[i];
                        }
                    }
                    let length = (Object.values(idx).length > 5) ? 5 : Object.values(idx).length;
                    if (Object.values(idx)) {      
                        console.log("User has tasks to do");                        
                        let vsebina = 'Opomniki za nedokončane naloge:\n\n';
                        for (let i=0; i<length; i++) {
                            vsebina += "Ime: "+Object.values(idx)[i].ime+"\nOpis: "+Object.values(idx)[i].opis+"\nZačetek: "+moment(Object.values(idx)[i].zacetek).format("D. M ob H:m")+
                            "\nKonec: "+moment(Object.values(idx)[i].konec).format("D. M ob H:m")+"\nTočk: "+Object.values(idx)[i].xp+"\n\n";
                        }
                        mailOptions = {
                            from: 'MyFamily@'+process.env.SPARKPOST_DOMAIN,
                            to: emailusers[j].email,
                            subject: "Opomnik " + moment(new Date()).format('M. D'),
                            text: vsebina,
                        }
                        console.log("Sending mail to user", mailOptions);
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('Email sent: ' + info.response);
                            }
                        });
                    }
                }
            });
        }
    });
}

function sendMessage(number, text){
    return smsapi.message
        .sms()
        .from('MyFamilyApp')
        .to(number)
        .message(text)
        .execute(); // return Promise
}

function displayResult(result){
    console.log(result);
}

function displayError(err){
    console.error(err);
}

function dateCheck(from, to, check) {
    let fDate, lDate, cDate;
    fDate = Date.parse(from);
    lDate = Date.parse(to);
    cDate = Date.parse(check);
    if ((cDate <= lDate && cDate >= fDate)) {
        return true;
    }
    return false;
}