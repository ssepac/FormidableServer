require("dotenv").config({path: `${process.cwd()}/.env`});
const nodemailer = require("nodemailer");

async function sendMail(to, code) {
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp-relay.sendinblue.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.smtpUser, // generated ethereal user
        pass: process.env.smtpPass, // generated ethereal password
      },
    });
  
    // send mail with defined transport object
    return transporter.sendMail({
      from: '"Sflix Mail Service" <ex.printstacktrace@gmail.com>', // sender address
      to, // list of receivers
      subject: "Another Code", // Subject line
      html: `<p>Your code is <strong>${code}</strong>.</p>`, // html body
    });
  }

  module.exports = {
      sendMail
  }