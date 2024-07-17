const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/send', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        console.log('Validation failed: Missing fields.');
        return res.status(400).send('Please complete the form and try again.');
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: email,
        to: process.env.EMAIL,
        subject: `New contact from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            if (error.response && error.response.includes('Invalid login')) {
                console.error('Authentication error:', error);
                return res.status(500).send('Authentication failed. Please check your email and password.');
            } else {
                console.error('Error occurred while sending email:', error);
                return res.status(500).send('Something went wrong. Please try again later.');
            }
        }
        console.log('Email sent successfully:', info.response);
        res.status(200).send('Message sent successfully!');
    });

});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
