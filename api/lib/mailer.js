const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templatePath = path.join(__dirname, "../Template/emailTemplate.html");
const emailTemplate = fs.readFileSync(templatePath, "utf8");

function renderTemplate(data) {
  return emailTemplate
    .replace(/\{\{orderNumber\}\}/g, data.orderNumber)
    .replace(/\{\{clientName\}\}/g, data.clientName)
    .replace(/\{\{orderDate\}\}/g, data.orderDate)
    .replace(/\{\{orderTime\}\}/g, data.orderTime)
    .replace(/\{\{totalPrice\}\}/g, data.totalPrice)
    .replace(/\{\{orderlink\}\}/g, data.orderLink);
}

/**
 * Send order confirmation email to client.
 * Fire-and-forget: errors are logged but do not throw.
 */
async function sendOrderConfirmation({ to, order }) {
  if (!to) return;

  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const html = renderTemplate({
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    clientName: order.fullName || "Client",
    orderDate: createdAt.toLocaleDateString("fr-FR"),
    orderTime: createdAt.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    totalPrice: `${parseFloat(order.totalPrice).toFixed(2)} €`,
    orderLink: `${process.env.CLIENT_URL}/order/${order.id}`,
  });

  try {
    await transporter.sendMail({
      from: `"Pokey" <${process.env.SMTP_USER}>`,
      to,
      subject: `Confirmation de commande #${order.id.slice(0, 8).toUpperCase()}`,
      html,
    });
    logger.info({ orderId: order.id, to }, "Order confirmation email sent");
  } catch (err) {
    logger.error(
      { orderId: order.id, to, error: err.message },
      "Failed to send order confirmation email",
    );
  }
}

/**
 * Send team invitation email.
 * Fire-and-forget: errors are logged but do not throw.
 */
async function sendInvitationEmail({ to, restaurantName, inviteLink }) {
  const html = `
    <div style="font-family:Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2>Vous avez été invité à rejoindre ${restaurantName}</h2>
      <p>Cliquez sur le lien ci-dessous pour accepter l'invitation :</p>
      <p><a href="${inviteLink}" style="background:#1f4493;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Accepter l'invitation</a></p>
      <p style="color:#999;font-size:14px;">Ce lien expire dans 7 jours.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Pokey" <${process.env.SMTP_USER}>`,
      to,
      subject: `Invitation à rejoindre ${restaurantName}`,
      html,
    });
    logger.info({ to, restaurantName }, "Invitation email sent");
  } catch (err) {
    logger.error({ to, error: err.message }, "Failed to send invitation email");
  }
}

const STATUS_LABELS = {
  PENDING: "confirmée",
  IN_PROGRESS: "en cours de préparation",
  COMPLETED: "prête",
  DELIVERED: "livrée",
  CANCELLED: "annulée",
};

const NOTIFIABLE_STATUSES = Object.keys(STATUS_LABELS);

/**
 * Send order status update email to client.
 * Fire-and-forget: errors are logged but do not throw.
 */
async function sendOrderStatusUpdate({ to, order, newStatus }) {
  if (!to) return;
  if (!NOTIFIABLE_STATUSES.includes(newStatus)) return;

  const label = STATUS_LABELS[newStatus];
  const orderRef = order.orderNumber
    ? `#${order.orderNumber}`
    : `#${order.id.slice(0, 8).toUpperCase()}`;

  const html = `
    <div style="font-family:Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2>Mise à jour de votre commande ${orderRef}</h2>
      <p>Bonjour ${order.fullName || ""},</p>
      <p>Votre commande est maintenant <strong>${label}</strong>.</p>
      <p style="color:#999;font-size:14px;">Merci pour votre commande !</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Pokey" <${process.env.SMTP_USER}>`,
      to,
      subject: `Commande ${orderRef} — ${label}`,
      html,
    });
    logger.info({ orderId: order.id, to, newStatus }, "Order status update email sent");
  } catch (err) {
    logger.error(
      { orderId: order.id, to, error: err.message },
      "Failed to send order status update email",
    );
  }
}

module.exports = { sendOrderConfirmation, sendInvitationEmail, sendOrderStatusUpdate };
