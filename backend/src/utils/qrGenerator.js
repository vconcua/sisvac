const QRCode = require('qrcode');
const crypto = require('crypto');

function generarPIN() {
  return String(crypto.randomInt(100000, 1000000)); // aleatorio criptográfico, 6 dígitos
}

async function generarQRCarnet(qrCodigo, baseUrl) {
  const url = `${baseUrl}/carnet/${qrCodigo}`;
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  });
  return { url, dataUrl };
}

module.exports = { generarPIN, generarQRCarnet };
