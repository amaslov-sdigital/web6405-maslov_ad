//Для работы сервера неоходимо заполнить строки 28-30

const path = require('node:path');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const nodemailer = require('nodemailer');

class PhotoRequest {
    constructor(photo, height, email) {
        this.photo = photo;
        this.height = height;
        this.email = email;
    }

    print() {
        console.log(`Фото: ${this.photo.originalname}\nРост: ${this.height} см\nПочта: ${this.email}`);
    }
}

const app = express();
const upload = multer().single('photo');
const elephant = path.join(__dirname, 'images', 'elephant.png');


const SMTP_HOST = 'smtp.yandex.ru';
const SMTP_PORT = 465;
const SMTP_USER = ''; //Имя пользователя
const SMTP_PASS = ''; //Пароль приложения
const SMTP_FROM = ''; //Адрес отправителя


const mailer = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    })
    : null;

async function makePhoto(file, height) {
    const { width, height: elephantHeight } = await sharp(elephant).metadata();
    const personHeight = Math.round(elephantHeight * height / 300);
    const { data: person, info } = await sharp(file)
        .resize({ height: personHeight }).png().toBuffer({ resolveWithObject: true });

    return sharp({
        create: { width: info.width + width, height: elephantHeight, channels: 3, background: 'white' }
    }).composite([
        { input: person, left: 0, top: elephantHeight - info.height },
        { input: elephant, left: info.width, top: 0 }
    ]).png().toBuffer();
}

app.post('/photo', upload, async (req, res) => {
    const request = new PhotoRequest(req.file, Number(req.body.height), req.body.email);
    request.print();

    if (!mailer) {
        return res.status(204).end();
    }

    const image = await makePhoto(request.photo.buffer, request.height);
    await mailer.sendMail({
        from: SMTP_FROM,
        to: request.email,
        subject: 'Ваше фото со слоном',
        text: 'Ваше фото во вложении.',
        attachments: [{ filename: 'photo-with-elephant.png', content: image }]
    });
    res.status(204).end();
});

app.listen(3000, '127.0.0.1');
