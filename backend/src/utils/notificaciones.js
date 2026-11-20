const nodemailer = require('nodemailer');
const axios = require('axios');
const { enviarSMS } = require('./snsPublisher');
require('dotenv').config();

const transportEmail = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function enviarEmail(destinatario, asunto, contenido) {
  return transportEmail.sendMail({
    from: `"Centro de Salud" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: asunto,
    text: contenido,
  });
}

async function enviarTelegram(chatId, contenido) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: contenido,
  });
}

async function enviarWhatsApp(telefono, contenido) {
  return axios.post(
    process.env.WHATSAPP_API_URL,
    {
      messaging_product: 'whatsapp',
      to: telefono,
      type: 'text',
      text: { body: contenido },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` } }
  );
}

async function enviarPorCanal(canal, destino, asunto, contenido) {
  try {
    if (canal === 'email') await enviarEmail(destino, asunto, contenido);
    else if (canal === 'telegram') await enviarTelegram(destino, contenido);
    else if (canal === 'whatsapp') await enviarWhatsApp(destino, contenido);
    else if (canal === 'sms') await enviarSMS(destino, contenido);
    else throw new Error(`Canal no soportado: ${canal}`);
    return { exito: true };
  } catch (error) {
    return { exito: false, error: error.message };
  }
}

/**
 * Resuelve el dato de contacto correcto según el canal preferido del
 * padre. Cada canal usa un campo distinto: el correo para email, el
 * chat_id (obtenido vía Telegram Bot API) para telegram, y el número
 * de teléfono en formato E.164 para whatsapp y sms.
 */
function resolverDestino(padre) {
  switch (padre.canal_preferido) {
    case 'email':
      return padre.correo;
    case 'telegram':
      return padre.telegram_chat_id;
    case 'whatsapp':
    case 'sms':
      return padre.telefono;
    default:
      return null;
  }
}

module.exports = { enviarEmail, enviarTelegram, enviarWhatsApp, enviarPorCanal, resolverDestino };
