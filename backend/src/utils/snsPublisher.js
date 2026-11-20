const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
require('dotenv').config();

const sns = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function publicarAlertaCritica(asunto, mensaje) {
  const topicArn = process.env.SNS_TOPIC_ARN_ALERTAS;
  if (!topicArn) {
    console.warn('SNS_TOPIC_ARN_ALERTAS no configurado; se omite la publicación en SNS');
    return { publicado: false };
  }
  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: asunto.slice(0, 100),
      Message: mensaje,
    })
  );
  return { publicado: true };
}

async function enviarSMS(telefono, mensaje) {
  await sns.send(
    new PublishCommand({
      PhoneNumber: telefono, // formato E.164, ej: +50212345678
      Message: mensaje,
    })
  );
  return { enviado: true };
}

module.exports = { publicarAlertaCritica, enviarSMS };
