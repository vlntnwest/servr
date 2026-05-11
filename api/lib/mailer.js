const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");

const smtpConfigured = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].every(
  (k) => !!process.env[k]
);

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
  if (!smtpConfigured) {
    logger.warn({ orderId: order.id }, "Order confirmation email skipped — SMTP not configured");
    return;
  }

  try {
    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
    const orderRef = order.orderNumber || order.id.slice(0, 8).toUpperCase();
    const html = renderTemplate({
      orderNumber: orderRef,
      clientName: order.fullName || "Client",
      orderDate: createdAt.toLocaleDateString("fr-FR"),
      orderTime: createdAt.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalPrice: `${parseFloat(order.totalPrice).toFixed(2)} €`,
      orderLink: `${process.env.CLIENT_URL}/order/${order.id}`,
    });

    await transporter.sendMail({
      from: `"Pokey" <${process.env.SMTP_USER}>`,
      to,
      subject: `Confirmation de commande #${orderRef}`,
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
  if (!smtpConfigured) {
    logger.warn({ to, restaurantName }, "Invitation email skipped — SMTP not configured");
    return;
  }

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
  if (!smtpConfigured) {
    logger.warn({ orderId: order.id, newStatus }, "Order status email skipped — SMTP not configured");
    return;
  }

  try {
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

/**
 * Verify SMTP configuration on startup.
 * Logs a warning if credentials are missing or connection fails.
 */
async function verifySmtp() {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.warn({ missing }, "SMTP not configured — emails will fail");
    return;
  }

  try {
    await transporter.verify();
    logger.info("SMTP connection verified");
  } catch (err) {
    logger.warn({ error: err.message }, "SMTP connection failed — emails may not be sent");
  }
}

module.exports = { sendOrderConfirmation, sendInvitationEmail, sendOrderStatusUpdate, verifySmtp };
