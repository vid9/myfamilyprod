"use strict";$(document).ready(function(){setTimeout(function(){var i=$('input[type="password"]:-webkit-autofill'),e=$('input[type="email"]:-webkit-autofill');i.parent().addClass("is-dirty"),e.parent().addClass("is-dirty")},100)});var intro=introJs();function prikaziRegistracija(){$("#registracija").show().scrollTop,intro.hideHints(),$("#prijava").hide()}function prikaziPrijava(){$("#registracija").hide(),intro.hideHints(),$("#prijava").show().scrollTop}function isImage(i){return"image"==i.type.split("/")[0]}function validateRegistracija(){return""==document.forms.registracijaForm.reg_name.value?($("#errIme").text("Polje je obvezno!").parent().addClass("is-invalid"),!1):""==document.forms.registracijaForm.reg_email.value?($("#errEmail").text("Polje je obvezno!").parent().addClass("is-invalid"),!1):""==document.forms.registracijaForm.reg_password.value?($("#errPass").text("Polje je obvezno").parent().addClass("is-invalid"),!1):document.forms.registracijaForm.reg_password.value!=document.forms.registracijaForm.reg_password_confirm.value?($("#errPass2").parent().addClass("is-invalid"),!1):""==document.forms.registracijaForm.reg_phone.value?($("#errTel").text("Polje je obvezno!").parent().addClass("is-invalid"),!1):void intro.hideHints()}function updatePic(i){console.log(i.files[0]),i.files[0]?$("#reg_slika_ime").val(i.files[0].name).parent().addClass("is-dirty"):$("#reg_slika_ime").val("").parent().removeClass("is-dirty")}function addHintsReg(){intro.setOptions({hintButtonLabel:"Razumem!",hintPosition:"top-right",hints:[{element:document.querySelector("#reg_name"),hint:"V polje vpišite vaše ime in priimek."},{element:document.querySelector("#reg_email"),hint:"V to polje vpišite vaš elektronski naslov, ki ga boste uporabljali za prijavo v aplikacijo in nanj prejemali obvestila."},{element:"#reg_password",hint:"V to polje vpišite geslo, ki naj bo dolgo vsaj 6 znakov. Geslo mora vsebovati vsaj eno veliko črko in številko."},{element:"#reg_password_confirm",hint:"Ponovno vpišite izbrano geslo."},{element:"#reg_phone",hint:"V to polje vpišite vašo telefonsko številko, na katero boste prejemali sms sporočila."},{element:"#avatars",hint:"Izberite si prikazno sliko v aplikaciji. Če slike ne izberete, vam bo določena s strani aplikacije."}]}),intro.onhintsadded(function(){console.log("all hints added")}),intro.onhintclick(function(i,e,a){console.log("hint clicked",i,e,a)}),intro.onhintclose(function(i){console.log("hint closed",i)}),intro.addHints()}function introPrijava(){(intro=introJs()).setOptions({nextLabel:"Naprej &rarr;",prevLabel:"&larr; Nazaj",skipLabel:"Zapri",doneLabel:"Konec",tooltipPosition:"auto",overlayOpacity:.5,steps:[{intro:"Pozdravljeni v aplikaciji MyFamily, v primeru težav pri uporabi aplikacije, pošljite elektronsko sporočilo na naslov vid.cermelj@ltfe.org ali veronika.zavratnik@ltfe.org."},{intro:"Če še niste registrirani, lahko to storite s klikom na gumb Registrirajte se."}]}),intro.start()}function chooseHelp(){introPrijava()}function validatePrijava(){return""==document.forms.prijavaForm.email.value?($("#emailErr").text("Vpišite uporabniško ime!").parent().addClass("is-invalid"),!1):""==document.forms.prijavaForm.password.value?($("#passErr").text("Vpištite geslo!").parent().addClass("is-invalid"),!1):void 0}