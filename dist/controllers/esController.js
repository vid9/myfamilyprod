let mongoose = require('mongoose');

let Uporabnik = mongoose.model("Uporabnik");
let Cilji = mongoose.model("Cilji");
let Naloge = mongoose.model("Naloge");
let Kategorija = mongoose.model("Kategroija");
let Subscription = mongoose.model("Subscription");

let express = require('express');
let async = require('async');
let ObjectId = mongoose.Types.ObjectId;
let bodyParser = require('body-parser');
let ejs = require('ejs');
let moment = require('moment');
let fs = require('fs');
let mkdirp = require('mkdirp');
let validator = require('validator');
//let SMSAPI = require('smsapicom'), smsapi = new SMSAPI();
//let CronJob = require('cron').CronJob;
//let nodemailer = require('nodemailer');
let shortId = require('short-mongo-id');
let webpush = require('web-push');

let color = { "5a78505d19ac7744c8175d18": "#FEC3BF", "5a785125e7c9722aa0e1e8ac": "#FFDDB9", "5aeabcd8be609116280b4d9c": "#97EBED", "5a785178900a3b278c196667": "#A5D8F3", "5aef78ab361f5244948ff58f": "#a3f7bf" };
let urlencodedParser = bodyParser.urlencoded({ extended: false });

webpush.setVapidDetails(
    'mailto:myFamilyAppMail@gmail.com',
    'BGa5M248kds3Uw6AkR6igb3aq4OQw1zFmSBNuFj10kwdsqZ8DXoYtvLUPCMsUIpMKQiPzdOY-s-3mkVnPhRUiQg' || process.env.VAPID_PUBLIC_KEY,
    'Ue3ZsN1R_48R17QCxR4vZHuNQu9gKspmVIVMwai-hPQ' || process.env.VAPID_PRIVATE_KEY
  );

let once = 0;


//let jobsCounter = 0;
//let jobs = {};

/*
smsapi.authentication
    .login(process.env.SMSAPI_user, process.env.SMSAPI_pass)
    .then(sendMessage)
    .then(displayResult)
    .catch(displayError); */
/*
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.mailUser,
        pass: process.env.mailPass
    }
});*/

function vrniNapako(res, err) {
    res.render("pages/error", { message: "Napaka pri poizvedbi /db", error: { status: 500, stack: err } });
}

//** GET /
module.exports.naslovnaStran = function (req, res) {
    //let t = mongoose.Types.ObjectId(); Short id za kategorije
    //console.log(t, shortId(t));
    if (checkIfLogged(res, req) != 0) return;
    let opomnik = [];
    let obj = { monthly: [] };
    let idx = {};
    //console.log(req.session.trenutniUporabnik.druzina);
    async.parallel({
        uporabniki: function (cb) {
            Uporabnik.find({ druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina) }).exec(cb);
        },
        cilji: function (cb) {
            Cilji.find({ $query: { druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina) }, $maxTimeMS: 10000 }).exec(cb);
        },
        docs: function (cb) {
            Naloge.find({ $query: { druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina) }, $maxTimeMS: 10000 }).then(naloga => {
                if (naloga.length == 0) {
                    cb();
                    return;
                }
                let j = 0, o = 0;
                for (let i = 0; i < naloga.length; i++) {
                    let zac = moment(naloga[i].zacetek).format();
                    let kon = moment(naloga[i].konec).format();
                    let now = moment(Date.now()).format();
                    //console.log("DANES JE: "+now)
                    if (naloga[i].vezani_uporabniki.indexOf(req.session.trenutniUporabnik.id) > -1) {
                        j = i;
                        let urZac = moment(naloga[i].zacetek).format('HH:mm');
                        let urKon = moment(naloga[i].konec).format('HH:mm');
                        if (!validator.matches(urZac, /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/g)) urZac = "00:00";
                        if (!validator.matches(urKon, /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/g)) urKon = "23:59";
                        obj.monthly.push({ //Dodaj nalogo v koledar
                            id: naloga[i].id,
                            name: naloga[i].ime,
                            startdate: moment(naloga[i].zacetek).format('YYYY-MM-DD'),
                            enddate: moment(naloga[i].konec).format('YYYY-MM-DD'),
                            starttime: urZac,
                            endtime: urKon,
                            color: color[naloga[i].kategorija],
                            url: "/koledar/" + naloga[i].id
                        });

                        if (zac && naloga[i].status == false) { // Če je naloga na današnji dan jo dodaj v opomnike
                            //console.log(zac, now, moment.duration(moment(zac).diff(moment(now))));
                            idx[Math.abs(moment.duration(moment(zac).diff(moment(now))))] = naloga[i];
                        }
                    }
                }
                for (let n = 0; n < Object.values(idx).length; n++) {
                    opomnik.push({
                        id: Object.values(idx)[n]._id,
                        ime: Object.values(idx)[n].ime,
                        opis: Object.values(idx)[n].opis,
                        kategorija: Object.values(idx)[n].kategorija,
                        zacetek: Object.values(idx)[n].zacetek,
                        konec: Object.values(idx)[n].konec,
                        xp: Object.values(idx)[n].xp,
                        vezani_uporabniki: Object.values(idx)[n].vezani_uporabniki,
                        vezan_cilj: Object.values(idx)[n].vezan_cilj,
                        avtor: Object.values(idx)[n].avtor,
                    });
                    if (n == 8) {
                        //console.log("y u no work");
                        cb();
                        return;
                    }
                }
                cb();
            }).catch(err => {
                console.log(err);
                vrniNapako(res, err);
                return;
            });
        },
        kategorija: function (cb) {
            Kategorija.find({ $query: {}, $maxTimeMS: 10000 }).exec(cb);
        },
    }, function (err, result) {
        if (err) {
            console.log(err);
            vrniNapako(err, res);
        }
        let sCilji = [];
        for (let i = 0; i < result.cilji.length; i++) {
            let temp = [];
            for (let j = 0; j < result.cilji[i].vezani_uporabniki.length; j++) {
                let usr = result.uporabniki.find(x => x.id == result.cilji[i].vezani_uporabniki[j].id_user);
                if (usr) temp.push(usr.slika);
            }
            if (result.cilji[i].skupni_cilj == true) {
                sCilji.push({ ime: result.cilji[i].ime, opis: truncate(result.cilji[i].opis, 100), vezani_uporabniki: result.cilji[i].vezani_uporabniki, maxXp: result.cilji[i].maxXp, xp: result.cilji[i].xp, slika: temp });

            }
            result.cilji[i].slika = temp;
            //console.log(result.cilji[i].vezani_uporabniki, "vezan"); 
        }
        //console.log(sCilji);
        for (let i = 0; i < opomnik.length; i++) {
            let temp = [];
            let kat = result.kategorija.find(x => x.id == opomnik[i].kategorija);
            let avt = result.uporabniki.find(x => x.id == opomnik[i].avtor);
            opomnik[i].kategorija = kat.ime;
            opomnik[i].avtor = [avt.slika, avt.ime]
            for (let j = 0; j < opomnik[i].vezani_uporabniki.length; j++) {
                let search = opomnik[i].vezani_uporabniki[j];
                let pic = result.uporabniki.find(x => x.id == opomnik[i].vezani_uporabniki[j]);
                if (pic) temp.push([pic.slika, pic.ime]);
            }
            opomnik[i].vezani_uporabniki = temp;
            //console.log(opomnik[i].vezan_cilj)

            let vcilj = result.cilji.find(x => x.id == opomnik[i].vezan_cilj);
            //console.log(vcilj);
            if (vcilj) opomnik[i].vezan_cilj = vcilj.ime;
        }
        posodobiJson(obj, req.session);
        //console.log(req.session.trenutniUporabnik.notf_email," status mail");
        res.render("pages/index", { uporabniki: result.uporabniki, currSession: req.session, cilji: result.cilji, kategorija: result.kategorija, id: req.session.trenutniUporabnik.id, opomniki: opomnik, skupniCilji: sCilji, moment: moment });
    });
};

module.exports.prijava = function (req, res, next) {
    res.redirect("/");
};

//** POST /priava
module.exports.prijaviUporabnika = function (req, res, next) {
    let email = req.body.email;
    let geslo = hash(req.body.password);
    console.log(hash(req.body.password));
    Uporabnik.find(function (err, uporabniki) {
        if (err) {
            console.log(err);
            res.render('pages/prijava', {
                isLoggedIn: false,
                uporabniki: 0,
                uporabnik: "",
                sporociloPrijava: "Uporabniško ime in geslo se ne ujemata!",
                currSession: "",
            });
        }
        else {
            req.session.trenutniUporabnik = null;
            for (i in uporabniki) {
                //ce se email in geslo ujemata
                if (uporabniki[i].email == email && uporabniki[i].geslo == geslo) {
                    //shrani podatke v sejo
                    req.session.trenutniUporabnik = {
                        email: uporabniki[i].email,
                        ime: uporabniki[i].ime,
                        telefon: uporabniki[i].telefon,
                        viber: uporabniki[i].viber,
                        id: uporabniki[i]._id,
                        druzina: uporabniki[i].druzina,
                        admin: uporabniki[i].admin,
                        slika: uporabniki[i].slika,
                        vrsta: uporabniki[i].vrsta,
                        notf_email: uporabniki[i].notf_email,
                        notf_telefon: uporabniki[i].notf_telefon
                    };
                    Uporabnik.findByIdAndUpdate(req.session.trenutniUporabnik.id, { last_login: new Date() }).catch(err => {
                        vrniNapako(res, err);
                    });
                    req.session.trenutniUporabnik.last_login = new Date();
                    break;
                }
            }
            console.log(req.session.trenutniUporabnik);
            if (req.session.trenutniUporabnik) {
                res.redirect("/");
            } else {
                res.render("pages/prijava", { sporociloPrijava: "Napačen e-mail in/ali geslo!", uporabnik: "", currSession: "" });
            }
        }
    });
};

//** POST /registracija
module.exports.ustvariUporabnika = function (req, res, next) {
    if (!req.body.avatar) req.body.avatar = 0;
    let noviUporabnik = {
        _id: new ObjectId(),
        ime: req.body.reg_name,
        druzina: new ObjectId(),
        geslo: hash(req.body.reg_password),
        email: req.body.reg_email,
        telefon: req.body.reg_phone,
        notf_email: false,
        notf_telefon: false,
        vrsta: 7,
        admin: false,
        slika: req.body.avatar,
        created_at: Date.now()
    };
    Uporabnik.create(noviUporabnik).then(data => {
        res.redirect('/');
    }).catch(err => {
        vrniNapako(res, err);
    });
};

//** POST /settings
module.exports.posodobiOsebnePodatke = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    let updateUporabnik = {
        ime: req.body.set_name,
        email: req.body.set_email,
        telefon: req.body.set_phone,
        vrsta: parseInt(req.body.izbranaVrsta),
    };
    if (req.body.reg_password) updateUporabnik.geslo = hash(req.body.set_password);
    if (req.body.avatar) updateUporabnik.slika = req.body.avatar;
    let conditions = { _id: req.session.trenutniUporabnik.id };
    Uporabnik.findOneAndUpdate(conditions, updateUporabnik, { upsert: true, runValidators: true }, function (err, doc) { // callback
        if (err) {
            console.log(err);
            vrniNapako(res, err);
        } else {
            req.session.trenutniUporabnik.vrsta = parseInt(req.body.izbranaVrsta);
            res.redirect('/')
        }
    });
};


//** POST /notifications
module.exports.posodobiObvestila = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    let mail = false, tel = false;
    req.session.trenutniUporabnik.notf_email = false;
    req.session.trenutniUporabnik.notf_telefon = false;
    if (req.body.switchMail) {
        mail = true;
        req.session.trenutniUporabnik.notf_email = true;
    }
    if (req.body.switchSms) {
        tel = true;
        req.session.trenutniUporabnik.notf_telefon = true;
    }
    let conditions = { _id: req.session.trenutniUporabnik.id };
    Uporabnik.find(conditions, { notf_telefon: 1, notf_email: 1 }).then(notif => {
        let updateUporabnik = {};        
        if (notif[0].notf_telefon != tel) {    
            updateUporabnik.notf_telefon = tel;        
            if (tel == true) {
                /*
                if (jobs[req.session.trenutniUporabnik.id + "sms"]) {
                    jobs[req.session.trenutniUporabnik.id + "sms"].start();
                } else {
                    jobs[req.session.trenutniUporabnik.id + "sms"] = new CronJob({
                        cronTime: '00 00 00 * * *',
                        onTick: function () {
                            Naloge.find({ vezani_uporabniki: mongoose.Types.ObjectId(this.jobName) }, function (err, naloga) {
                                if (err) {
                                    throw err;
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
                                    if (temp && once == 0) {
                                        once = 1;                                
                                        let vsebina = 'Današnji opomniki:\n\n';
                                        for (i=0;i<temp.length;i++) {
                                            vsebina += "Ime: "+temp[i].ime+"\nOpis: "+temp[i].opis+"\nZačetek: "+moment(temp[i].zacetek).format("D. M ob H:m")+
                                            "\nKonec: "+moment(temp[i].konec).format("D. M ob H:m")+"\nTočk: "+temp[i].xp+"\n\n";
                                        }
                                        let name = "MyFamily opomnik";
                                        sendMessage(name, this.number, vsebina);
                                    }
                                }
                            });
                        },
                        start: true,
                        timeZone,
                        context: { jobName: req.session.trenutniUporabnik.id, number: req.session.trenutniUporabnik.telefon, }
                    });
                }*/
            } else {
                /*
                if (jobs[req.session.trenutniUporabnik.id + "sms"]) {
                    jobs[req.session.trenutniUporabnik.id + "sms"].stop();
                }
                */
            }
        }  
        if (notif[0].notf_email != mail) {
            updateUporabnik.notf_email = mail;         
            if (mail == true) {
                /*
                if (jobs[req.session.trenutniUporabnik.id + "email"]) {
                    jobs[req.session.trenutniUporabnik.id + "email"].start();
                } else {
                    jobs[req.session.trenutniUporabnik.id + "email"] = new CronJob({
                        cronTime: "* * * * *",
                        onTick: function () {
                            Naloge.find({ vezani_uporabniki: mongoose.Types.ObjectId(this.jobName) }, function (err, naloga) {
                                if (err) {
                                    throw err;
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
                                    if (temp && once == 0) {
                                        once = 1;                                
                                        let vsebina = 'Današnji opomniki:\n\n';
                                        for (i=0;i<temp.length;i++) {
                                            vsebina += "Ime: "+temp[i].ime+"\nOpis: "+temp[i].opis+"\nZačetek: "+moment(temp[i].zacetek).format("D. M ob H:m")+
                                            "\nKonec: "+moment(temp[i].konec).format("D. M ob H:m")+"\nTočk: "+temp[i].xp+"\n\n";
                                        }
                                        console.log("setting options");
                                        mailOptions = {
                                            from: '"MyFamily mailer"'+process.env.mailUser,
                                            to: '"Usr"'+this.eMail,
                                            subject: "Opomnik " + moment(new Date()).format('M. D'),
                                            text: vsebina,
                                        }
                                        console.log(vsebina);
                                        console.log("Sending mail");
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
                        },
                        start: true,
                        context: { jobName: req.session.trenutniUporabnik.id, eMail: req.session.trenutniUporabnik.email}
                    });
                }*/
            } else {
                /*
                if (jobs[req.session.trenutniUporabnik.id + "email"]) {
                    jobs[req.session.trenutniUporabnik.id + "email"].stop();
                }*/
            }
        }
        if (updateUporabnik) {
            Uporabnik.findOneAndUpdate(conditions, updateUporabnik, { upsert: false, runValidators: true }, function (err, doc) { // callback
                if (err) {
                    console.log(err);
                    vrniNapako(res, err);
                } else {
                    res.redirect('/')
                }
            });
        }
    }).catch(err => {
        vrniNapako(res, err);
    });
};

//** GET /koledar/:koledarId
module.exports.prikaziKoledar = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    return queryNaloge({ _id: req.params.koledarId }, {}).then(function (naloge) {
        //console.log(naloge);
        return queryKategorija({ _id: mongoose.Types.ObjectId(naloge[0].kategorija) }, { ime: 1 }).then(function (kategorija) {
            naloge[0].vezani_uporabniki.unshift(naloge[0].avtor);
            return queryUporabniki({ _id: naloge[0].vezani_uporabniki}, { slika: 1, ime: 1 }).then(function (users) {
                //console.log(users);
                res.render("pages/nalogakoledar", { naloge: naloge, moment: moment, kategorija: kategorija[0].ime, vezani: users, shortId: shortId });
            }).catch(err => {
                return vrniNapako(res, err);
            });
        }).catch(err => {
            return vrniNapako(res, err);
        });
    }).catch(err => {
        return vrniNapako(res, err);
    });
};

//** POST /prikazi_naloge
module.exports.prikaziNaloge = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    let where_search = {};
    let query = {};
    where_search.druzina = mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina);
    if (req.body.avtor) where_search.avtor = req.body.avtor;
    if (req.body.kategorija) where_search.kategorija = req.body.kategorija;
    if (req.body.status) where_search.status = (req.body.status == 'true');
    if (req.body.cilj) where_search.vezan_cilj = req.body.cilj;
    if (req.body.oseba) where_search.vezani_uporabniki = req.body.oseba;
    if (req.body.koledar) {
        if (req.body.koledar == "1") {
            query = { zacetek: -1 };
        } else if (req.body.koledar == "2"){
            query = { zacetek: 1 };
        }else if (req.body.koledar == "3"){
            query = { konec: -1 };
        }else if (req.body.koledar == "4"){
            query = { konec: 1 };
        }
        //console.log(query);
    }
    //console.log(where_search);
    async.parallel({
        docs: function (cb) { Naloge.find(where_search).sort(query).exec(cb); },
        kategorija: function (cb) { Kategorija.find().exec(cb); },
        cilji: function (cb) { Cilji.find({ druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina) }).select("ime").exec(cb); },
        uporabnik: function (cb) { Uporabnik.find({ druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina) }).select("slika ime").exec(cb); },
    },
        function (err, results) {
            if (err) {
                return vrniNapako(err, res);
            }
            //console.log(results.docs);
            let kat = {}, usr = {};
            for (let i = 0; i < results.kategorija.length; i++) {
                kat[results.kategorija[i].id] = results.kategorija[i].ime;
            }
            for (let i = 0; i < results.uporabnik.length; i++) {
                usr[results.uporabnik[i].id] = [results.uporabnik[i].slika, results.uporabnik[i].id, results.uporabnik[i].ime];
            }
            let imeCilj = [];
            for (let i = 0; i < results.docs.length; i++) {
                let ime = results.cilji.find(x => x.id == results.docs[i].vezan_cilj);
                if (ime) { imeCilj.push(ime.ime); }
                else { imeCilj.push("Samostojna naloga"); }
            }
            //console.log(results.docs);
            res.render("pages/nalogequery", { naloge: results.docs, moment: moment, kategorija: kat, slika: usr, imeCilj: imeCilj, shortId: shortId });
        });
};

//** POST /ustvari_nalogo
module.exports.ustvariNalogo = function (req, res, next) {
    if (!req.body.mode) if (checkIfLogged(res, req) != 0) return;
    if (!validatenaloga(req, res)) return;
    if (req.body.oldCilj) if (!validator.isMongoId(req.body.oldCilj)) { vrniNapako(res, "Napačena oblika mongoId cilja!" + req.body.oldCilj); return false; }
    if (!req.body.dateZacetek) req.body.dateZacetek = new Date().toLocaleTimeString('sl-SI', { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", timeZoneName: "short" });
    if (!req.body.dateKonec) req.body.dateKonec = new Date().toLocaleTimeString('sl-SI', { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", timeZoneName: "short" });
    if (req.body.dateZacetek > req.body.dateKonec) { vrniNapako(res, "Datum konca ne sme biti pred datumom začetka. " + req.body.dateZacetek + " " + req.body.dateKone); return; }
    let dZac = req.body.dateZacetek;
    let dKon = req.body.dateKonec;
    if (dZac != "") {
        if (dKon != "" && dZac > dKon) {
            return vrniNapako(res, "Za vezan cilj so bili uporabljeni napačni znaki. " + dZac + " " + dKon);
        }
    }
    let currXp = req.body.xpNaloge;
    if (req.body.newStatus == "false" && req.body.oldStatus == "true") currXp = -currXp;
    else if (req.body.oldStatus == "false" && req.body.newStatus == "false") currXp = 0;
    else if (req.body.oldStatus == "true" && req.body.newStatus == "true") currXp = 0;
    let vCilj = req.body.sampleCilj ? req.body.sampleCilj : null;
    let novaNaloga = {}
    if (req.body.mode) {
        novaNaloga = {
            status: true,
        };
    } else {
        novaNaloga = {
            ime: req.body.imeDialog,
            opis: req.body.opisDialog,
            kategorija: req.body.sampleKategorija,
            zacetek: dZac,
            konec: dKon,
            vezani_uporabniki: [],
            xp: req.body.xpNaloge,
            vezan_cilj: vCilj,
            avtor: ObjectId(req.session.trenutniUporabnik.id),
            status: req.body.newStatus,
            druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina),
        };
    }
    
    if (mongoose.Types.ObjectId.isValid(req.body.person)) {
        novaNaloga.vezani_uporabniki.push(req.body.person);
    } else {
        if (req.body.person) {
            for (let i = 0; i < req.body.person.length; i++) {
                if (mongoose.Types.ObjectId.isValid(req.body.person[i])) {
                    novaNaloga.vezani_uporabniki.push(mongoose.Types.ObjectId(req.body.person[i]));
                }
            }
        }
    }
    if (req.body.dateZacetek == "") novaNaloga.zacetek = dateNow();
    if (req.body.dateKonec == "") novaNaloga.konec = novaNaloga.zacetek;
    let conditions = { _id: req.body.newDialog ? req.body.newDialog : mongoose.Types.ObjectId() };
    Naloge.findOneAndUpdate(conditions, novaNaloga, { upsert: true, runVlidators: true}, function (err, doc) { // callback
        if (err) {
            console.log(err);
            res.status(400).end("Pri shranjevanju naloge je prišlo do napake!");
            return;
        } else {
            if (req.body.mode || req.body.newStatus == true) { //če je naloga opravljena pošljem obvestilo uporabnikom
                let podatki = doc ? doc : novaNaloga;
                let arr = podatki.vezani_uporabniki;
                let index = arr.indexOf(req.session.trenutniUporabnik._id);
                if (index !== -1) arr.splice(index, 1);
                console.log(arr, "user");
                Subscription.find({ user_id: arr }, function (err, sub) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log(sub,"sub");
                    for(let m = 0; m < sub.length;m++) {
                        const payload = JSON.stringify({
                            title: 'Obvestilo',
                            body: 'Naloga '+podatki.ime+' je bila opravljena. Dobili ste '+podatki.xp+' točk!',
                            icon: 'images/f.ico'
                        });
                        triggerPushMsg(sub[m], payload);
                    }
                });         
            }     
            if(!doc) doc = novaNaloga;  
            let o = doc.vezani_uporabniki.map(value => String(value));
            let c = o;
            if (!req.body.mode) c = novaNaloga.vezani_uporabniki.map(value => String(value));
            let differenceO = o.filter(x => !c.includes(x));   
            let differenceC = c.filter(x => !o.includes(x)); 
            if(req.body.mode || req.body.newStatus == "true" && req.body.oldStatus == "false") {
                let updt = doc.vezani_uporabniki;
                if (novaNaloga.vezani_uporabniki) updt = novaNaloga.vezani_uporabniki;
                let upXp = doc.xp;
                if (novaNaloga.xp) upXp = novaNaloga.xp;
                Uporabnik.update({ _id: { $in: updt } }, { $inc: { dayXp: upXp } }, { multi: true }, function (err, docs) {
                    if (err) {
                        console.log(err);
                        res.status(400).end("Pri shranjevanju točk je prišlo do napake!");
                        return;
                    }
                });
            } else if (req.body.newStatus == "true" && req.body.oldStatus == "true") {
                let dif = [];
                let pre = 1;
                if (differenceO.length != 0) { 
                    dif = differenceO;
                    pre = -1;
                } else {
                    dif = differenceC;
                    pre = 1;
                }      
                Uporabnik.update({ _id: { $in: dif } }, { $inc: { dayXp: req.body.xpNaloge*pre } }, { multi: true }, function (err, docs) {
                    if (err) {
                        console.log(err);
                        res.status(400).end("Pri shranjevanju točk je prišlo do napake!");
                        return;
                    }
                });                      
            } else if (req.body.newStatus == "false" && req.body.oldStatus == "true") {
                Uporabnik.update({ _id: { $in: novaNaloga.vezani_uporabniki } }, { $inc: { dayXp: -req.body.xpNaloge } }, { multi: true }, function (err, docs) {
                    if (err) {
                        console.log(err);
                        res.status(400).end("Pri shranjevanju točk je prišlo do napake!");
                        return;
                    }
                }); 
            }
            //Če je naloga prestavljena pod drug cilj, sinhorniziram točke
            if (vCilj) {
                console.log("naloga je vezana na cilj");
                if (req.body.oldCilj != req.body.sampleCilj && req.body.newDialog) {
                    console.log("Naloga je bila prestavljena pod drug cilj");
                    Cilji.findOne({ _id: req.body.oldCilj }, function (err, cilj) {
                        if (!err) {
                            let obj = cilj.vezani_uporabniki.map(value => String(value.id_user));
                            if (!obj) obj = {};
                            for (let i = 0; i < doc.vezani_uporabniki.length; i++) { // Odstranim vse osvojene točke izpod vezanih uporabnikov
                                let index = obj.indexOf(String(doc.vezani_uporabniki[i]));
                                if (index !== -1) {    
                                    if (req.body.oldStatus) cilj.vezani_uporabniki[index].xp_user = parseInt(cilj.vezani_uporabniki[index].xp_user) - parseInt(req.body.xpNaloge);}
                            }
                            for (let i = cilj.vezani_uporabniki.length-1; i >= 0; i--) {
                                if (cilj.vezani_uporabniki[i].xp_user == 0 ) {
                                    cilj.vezani_uporabniki.splice(i,1);
                                }
                            }                            
                            if (req.body.newStatus && req.body.oldStatus) cilj.xp = parseInt(cilj.xp) - parseInt(req.body.xpNaloge); // Odstranim točke iz cilja
                            obj = cilj.vezane_naloge.map(value => String(value.id_nal));   
                            let nalId = obj.indexOf(String(req.body.newDialog));
                            if (nalId !== -1) { cilj.vezane_naloge.splice(nalId, 1); /*Odstranim nalogo iz vezanih nalog*/}
                            cilj.save(function (err) {
                                if (!err) {}
                                else {
                                    console.log(err);
                                    res.status(400).end("Pri shranjevanju naloge je prišlo do napake!");
                                    return;
                                }
                            });
                        } else {
                            console.log(err);
                            res.status(400).end("Pri shranjevanju naloge je prišlo do napake!");
                            return;
                        }
                    });
                }
                //Iščem cilj, pod katerega je bila dodana naloga, uporabnikom prištejem vrednost za naloge, ki so jih naredili
                Cilji.findOne({ _id: req.body.sampleCilj }, function (err, cilj) {
                    if (!err) {
                        let obj = cilj.vezani_uporabniki.map(value => String(value.id_user));
                        let curObj = novaNaloga.vezani_uporabniki.map(value => String(value));
                        if (!obj) obj = {};
                        for (let i = 0; i < novaNaloga.vezani_uporabniki.length; i++) {
                            let index = obj.indexOf(String(novaNaloga.vezani_uporabniki[i]));
                            if (index > -1) { //prištejem točke                               
                                cilj.vezani_uporabniki[index].xp_user = parseInt(cilj.vezani_uporabniki[index].xp_user) + parseInt(currXp);
                            } else {  //Če uporabnik še ni v cilju, ga dodam   
                                let temp = 0;
                                if (req.body.newStatus) temp = req.body.xpNaloge;                
                                 cilj.vezani_uporabniki.push({ "id_user": novaNaloga.vezani_uporabniki[i], "xp_user": temp });
                            }                          
                        }
                        let difference = obj.filter(x => !curObj.includes(x));                        
                        if (req.body.oldStatus) {
                            //console.log(difference);
                            for(let i=0;i<difference.length;i++) {
                                let index = obj.indexOf(difference[i]);
                                //console.log(index);
                                cilj.vezani_uporabniki[index].xp_user = parseInt(cilj.vezani_uporabniki[index].xp_user) - parseInt(req.body.xpNaloge);
                            }
                        }
                        for (let i = cilj.vezani_uporabniki.length-1; i >= 0; i--) {
                            if (cilj.vezani_uporabniki[i].xp_user == 0 ) {
                                cilj.vezani_uporabniki.splice(i,1);
                            }
                        }
                        //console.log("Osvežim točke cilja");
                        if (req.body.oldCilj == req.body.sampleCilj) {cilj.xp = parseInt(cilj.xp) + parseInt(currXp);}
                        else cilj.xp = parseInt(cilj.xp) + parseInt(req.body.xpNaloge);                        
                        obj = cilj.vezane_naloge.map(value => String(value.id_nal));
                        let nalId = conditions._id;
                        if (req.body.newDialog) nalId = req.body.newDialog;
                        if (obj) {
                            let index = obj.indexOf(nalId);
                            if (index > -1) {
                                cilj.vezane_naloge[index].stanje = req.body.newStatus;
                            } else {
                                cilj.vezane_naloge.push({ "id_nal": nalId, "stanje": req.body.newStatus });
                            }
                        }
                        cilj.save(function (err) {
                            if (!err) {
                                if (doc) {
                                    res.status(200).end("Naloga je bila uspešno posodobljena!");
                                } else {
                                    res.status(200).end("Naloga je bila uspešno ustvarjena!");
                                }
                            }
                            else {
                                console.log(err);
                                res.status(400).end("Pri shranjevanju naloge je prišlo do napake!");

                                return;
                            }
                        });
                    } else {
                        console.log(err);
                        res.status(400).end("Pri shranjevanju naloge je prišlo do napake!");
                        return;
                    }
                });
            }
            if (doc) {
                res.status(200).end("Naloga je bila uspešno posodobljena!");
            } else {
                res.status(200).end("Naloga je bila uspešno ustvarjena!");
            }
        }
    });
};

//** POST /ustvari_cilj
module.exports.ustvariCilj = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    //console.log(req.body);
    validateImeOpisId(req, res);
    if (!validator.isInt(req.body.xpNaloge)) { vrniNapako(res, "Dovoljene so samo cele številke."); return false; }
    let updated = dateNow();
    let novCilj = {
        ime: req.body.imeDialog,
        opis: req.body.opisDialog,
        last_updated: updated,
        skupni_cilj: req.body.skupnaNaloga,
        maxXp: req.body.xpNaloge,
        druzina: mongoose.Types.ObjectId(req.session.trenutniUporabnik.druzina)
    };
    let conditions = { _id: mongoose.Types.ObjectId() };
    if (req.body.newDialog) {
        conditions = { _id: req.body.newDialog };
        if (req.body.stanje) {
            novCilj.konec = updated;
        }
    } else {
        novCilj.zacetek = updated;
        novCilj.xp = 0;
    }
    Cilji.findOneAndUpdate(conditions, novCilj, { upsert: true, runValidators: true }, function (err, doc) { // callback
        if (err) {
            console.log(err);
            res.status(400).end("Pri shranjevanju cilja je prišlo do napake!");
        } else {
            if (doc) {
                res.status(200).end("Cilj je bil uspešno posodobljen!");
            } else {
                res.status(200).end("Cilj je bil uspešno ustvarjen!");
            }
        }
    });
};

//** POST /invite
module.exports.povabiUporabnika = function (req, res, next) {
    if (!validator.isEmail(req.body.invite_email)) { vrniNapako(res, "Vpisan email ni ustrezen. " + req.body.invite_email); return false; }
    //console.log(req.body.invite_email);
    var mailOptions = {
        from: process.env.mailUser,
        to: req.body.invite_email,
        subject: 'MyFamily povabilo'
    };
    mailOptions.html = '<p><h1>Pozdravljen!</h1>Vabim te, da se mi pridužiš kot član družine v aplikaciji MyFamily.<br/><br/>Najprej se registriraj na ' +
        '<a href="https://ekosmartweb.herokuapp.com/prijava">spletni strani</a>, nato se prijavi v aplikacijo in klikni na spodnjo povezavo.<br/><br/>' +
        '<a href="https://ekosmartweb.herokuapp.com/change/' + req.session.trenutniUporabnik.druzina + '">' +
        'Pridruži se družini</a><br/><br/>Po uspešni včlanitvi si izberi svojo vlogo v družini. Najdeš jo v zgornjem desnem meniju pod možnostjo Osebne nastavitve.' +
        '<br/><br/>Lep pozdrav,<br/>' + req.session.trenutniUporabnik.ime + '</p>';
    console.log(mailOptions.html);
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error, "error");
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.redirect('/');
};


//** GET /change/:druzinaId
module.exports.spremeniDruzino = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    let druzina = mongoose.Types.ObjectId(req.params.druzinaId);
    Uporabnik.update({ _id: req.session.trenutniUporabnik.id }, {
        druzina: druzina,
    }, function (err, affected, resp) {
        if (err) {
            console.log(err);
            vrniNapako(res, err);
            return;
        }
        req.session.trenutniUporabnik.druzina = druzina;
        res.redirect('/');
    })
};

//** POST /status
module.exports.shraniStatus = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    if (req.body.currStatus) {
        Uporabnik.findOneAndUpdate({ _id: req.session.trenutniUporabnik.id }, { status: req.body.currStatus }, { upsert: true }, function (err, doc) {
            if (err) {
                res.status(400).end("Napaka! Status ni bil posodobljen.");
            } else {
                res.status(200).end("Status je bil uspešno posodobljen.");
            }
        });
    }
};

//** POST /delete-naloga
module.exports.izbrisiNalogo = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    //console.log(req.body);  
    if (req.body.id) {
        Naloge.findOneAndRemove({ _id: req.body.id }, function (err) {
            if (err) {
                res.status(400).end("Napaka! Naloga ni bila izbrisana.");
            }
            else {
                res.status(200).end("Naloga je bila uspešno izbrisana!");
            }
        });
    }
};

//** POST /delete-cilj
module.exports.izbrisiCilj = function (req, res, next) {
    if (checkIfLogged(res, req) != 0) return;
    if (req.body.id) {
        Cilji.findOneAndRemove({ _id: req.body.id }, function (err) {
            if (err) {
                res.status(400).end("Napaka! Cilj ni bil izbrisan.");
            }
            else {
                Naloge.update({ vezan_cilj: req.body.id }, { vezan_cilj: null }, { multi: true });
                res.status(200).end("Cilj je bil uspešno izbrisan!");
            }
        });
    }
};


//** GET /odjava

module.exports.odjava = function (req, res, next) {
    req.session.destroy();
    res.redirect('/');
};

function validatenaloga(req, res) {
    if (!validateImeOpisId(req, res)) return false;
    if (req.body.sampleKategorija) if (!validator.isMongoId(req.body.sampleKategorija)) { vrniNapako(res, "Za kategorijo so bili uporabljeni napačni znaki. " + req.body.sampleKategorija); return false; }
    if (req.body.xpNaloge) if (!validator.isInt(req.body.xpNaloge, [{ min: 1, max: 100 }])) { vrniNapako(res, "Izbrana vrednost mora biti med 1 in 100 xp."); return false; }
    if (req.body.sampleCilj) if (!validator.isMongoId(req.body.sampleCilj)) { vrniNapako(res, "Za vezan cilj so bili uporabljeni napačni znaki. " + req.body.sampleCilj); return false; }
    return true;
}

function validateImeOpisId(req, res) {
    if (req.body.newDialog != "") { if (!validator.isMongoId(req.body.newDialog)) { vrniNapako(res, "Id za posodobitev je napačen. " + req.body.newDialog); return false; } }
    if (req.body.imeDialog) if (!validator.matches(req.body.imeDialog, /^[A-ZČĆŽŠĐ0-9.,\s]+$/i)) { vrniNapako(res, "Za ime so bili uporabljeni napačni znaki. " + req.body.imeDialog); return false; }
    if (req.body.opisDialog) if (!validator.matches(req.body.opisDialog, /^[A-ZČĆŽŠĐ0-9.,\s]+$/i)) { vrniNapako(res, "Za opis so bili uporabljeni napačni znaki. " + req.body.opisDialog); return false; }
    return true;
}

function dateNow() {
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1;
    let yyyy = today.getFullYear();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    today = yyyy + '-' + mm + '-' + dd;
    return today;
}

function ustvariKljuc() {
    return 121;
}

function poisciCilj() {
    return new ObjectId();
}

function posodobiJson(obj, session) {
    let json = JSON.stringify(obj);
    mkdirp('app/public/calendar/' + session.trenutniUporabnik.id, function (err) {
        if (err) throw err;
        fs.writeFile('app/public/calendar/' + session.trenutniUporabnik.id + '/events.json', json, 'utf8', function (err) {
            if (err) throw err;
        });
    });
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

function sendMessage(name, number, text) {
    return smsapi.message
        .sms()
        .from(name)
        .to(number)
        .message(text)
        .execute(); // return Promise
}

function displayResult(result) {
    console.log(result);
}

function displayError(err) {
    console.error(err);
}

function queryNaloge(query, fields) {
    return new Promise(function (resolve, reject) {
        Naloge.find(query, fields, function (err, result) {
            if (err) {
                throw err;
                reject(err);
            }
            resolve(result);
        });
    });
}

function queryKategorija(query, fields) {
    return new Promise(function (resolve, reject) {
        Kategorija.find(query, fields, function (err, result) {
            if (err) {
                throw err;
                reject(err);
            }
            resolve(result);
        });
    });
}

function queryUporabniki(query, fields) {
    return new Promise(function (resolve, reject) {
        Uporabnik.find(query, fields, function (err, result) {
            if (err) {
                throw err;
                reject(err);
            }
            resolve(result);
        });
    });
}

function checkIfLogged(res, req) {
    if (!req.session.trenutniUporabnik) {
        console.log("User is not logged!");
        res.render('pages/prijava', {
            uporabnik: "",
            sporociloPrijava: "",
            currSession: "",
        });
        return 1;
    }
    return 0;
}


function hash(inp) {
    let hs = 0, i, chr;
    for (i = 0; i < inp.length; i++) {
        chr = inp.charCodeAt(i);
        hs = ((hs << 5) - hs) + chr;
        hs |= 0; // Convert to 32bit integer
    }
    return hs;
};

function triggerPushMsg(subscription, payload) {
    let options = {
        TTL: 3600 // 1sec * 60 * 60 = 1h
    };

    return webpush.sendNotification(
        subscription, 
        payload,
        options
    ).catch((err) => {
        if (err.statusCode === 410) {
            return deleteSubscriptionFromDatabase(subscription._id);
        } else {
            console.log('Subscription is no longer valid: ', err);
        }
    });
};


function truncate(string, num){
    if (string.length > num)
        return string.substring(0,num)+'...';
    else
        return string;
};