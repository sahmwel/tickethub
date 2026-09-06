// backend/lib/mailer.js

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER,
  port: Number(process.env.EMAIL_PORT || 465),
  secure: Number(process.env.EMAIL_PORT || 465) === 465,
  auth: {
    user: process.env.EMAIL_NOREPLY_USER,
    pass: process.env.EMAIL_NOREPLY_PASS,
  },
});

// Helper function to format money
function formatMoney(amount, currency = "NGN") {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
  return `${symbol}${amount.toLocaleString()}`;
}

function formatEventDate(isoString, timezone = "Africa/Lagos") {
  if (!isoString) return "";
  try {
    const tz = timezone || "Africa/Lagos";
    const tzAbbr = new Date(isoString).toLocaleTimeString("en-US", {
      timeZone: tz,
      timeZoneName: "short"
    }).split(" ").pop();
    
    return (
      new Date(isoString).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
      }) + ` (${tzAbbr})`
    );
  } catch {
    return isoString;
  }
}

// Builds a PDF with one ticket per page: event details + QR code image.
function buildTicketsPdf({ eventTitle, eventDate, venue, reference, tickets, qrBuffers, timezone }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const formattedDate = formatEventDate(eventDate, timezone);

    tickets.forEach((ticket, i) => {
      if (i > 0) doc.addPage();

      doc
        .fillColor("#F2B33D")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("SAHM TICKETHUB", { characterSpacing: 2 });

      doc.moveDown(1.2);
      doc
        .fillColor("#111111")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(eventTitle);

      doc.moveDown(0.6);
      doc
        .fillColor("#444444")
        .font("Helvetica")
        .fontSize(11)
        .text(formattedDate)
        .text(venue);

      doc.moveDown(0.8);
      doc
        .fillColor("#888888")
        .fontSize(9)
        .text(`Order reference: ${reference}`);

      doc.moveDown(1.5);

      const qrSize = 180;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const qrX = doc.page.margins.left + (pageWidth - qrSize) / 2;
      doc.image(qrBuffers[i], qrX, doc.y, { width: qrSize, height: qrSize });

      doc.y += qrSize + 16;
      doc
        .fillColor("#666666")
        .font("Helvetica")
        .fontSize(9)
        .text(`Ticket holder: ${ticket.holder_name}`, { align: "center" })
        .text(`Ticket ${i + 1} of ${tickets.length}`, { align: "center" });

      doc.moveDown(1);
      doc
        .fillColor("#999999")
        .fontSize(8)
        .text("Present this QR code at the door. Each code scans once.", { align: "center" });
    });

    doc.end();
  });
}

// ============================================
// TICKET CONFIRMATION EMAILS
// ============================================

export async function sendTicketConfirmation({
  to,
  buyerName,
  eventTitle,
  eventDate,
  venue,
  quantity,
  reference,
  tickets,
  qrBuffers,
  timezone,
}) {
  const formattedDate = formatEventDate(eventDate, timezone);
  const ticketLabel = quantity > 1 ? "tickets" : "ticket";

  const qrBlocks = qrBuffers
    .map(
      (_, i) => `
      <tr>
        <td align="center" style="padding: 0 0 16px 0;">
          <table role="presentation" width="280" cellpadding="0" cellspacing="0" style="background:#141418;border:1px solid #26262C;border-radius:14px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:24px 24px 8px 24px;">
                <img src="cid:ticket-qr-${i}" width="180" height="180" alt="Ticket ${i + 1} QR code" style="display:block;border-radius:10px;background:#ffffff;padding:8px;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 24px 20px 24px;">
                <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.5px;color:#8A8993;">
                  TICKET ${i + 1} OF ${qrBuffers.length}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const qrAttachments = qrBuffers.map((buffer, i) => ({
    filename: `ticket-${i + 1}-qr.png`,
    content: buffer,
    cid: `ticket-qr-${i}`,
  }));

  const pdfBuffer = await buildTicketsPdf({
    eventTitle,
    eventDate,
    venue,
    reference,
    tickets,
    qrBuffers,
    timezone,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `You're in! Your ${ticketLabel} for ${eventTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0A0A0C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">
          <!-- Email content -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:3px;color:#F2B33D;text-transform:uppercase;">
                Sahm TicketHub
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:48px;height:48px;background:#F2B33D;border-radius:50%;text-align:center;vertical-align:middle;font-size:24px;line-height:48px;">
                    ✓
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#F5F1E8;font-weight:normal;">
                You're in, ${buyerName.split(" ")[0]}.
              </h1>
            </td>
          </tr>
          <tr>
            <td style="background:#141418;border:1px solid #26262C;border-radius:16px;padding:24px 28px;">
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">
                Event
              </p>
              <p style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#F5F1E8;">
                ${eventTitle}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;">
                    <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">
                      Date &amp; time
                    </p>
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">
                      ${formattedDate}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:14px;">
                    <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">
                      Venue
                    </p>
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">
                      ${venue}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">
                      Order reference
                    </p>
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:#F2B33D;">
                      ${reference}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 8px 0;">
              <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;text-align:center;">
                Your ${ticketLabel}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${qrBlocks}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 12px 24px 12px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8993;line-height:1.6;">
                Show the QR code${quantity > 1 ? "s" : ""} above at the door, or the attached PDF —
                each one scans once.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 12px 24px 12px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8A8993;">
                Need to transfer a ticket or see all your orders? Visit
                <a href="https://sahmtickethub.online/manage-ticket" style="color:#F2B33D;">sahmtickethub.online/manage-ticket</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top:1px solid #26262C;padding-top:20px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5C5B63;">
                Sahm TicketHub &middot; Kaduna, Nigeria
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    attachments: [
      ...qrAttachments,
      {
        filename: `Sahm-TicketHub-${reference}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

// ============================================
// TICKET TRANSFER EMAILS
// ============================================

export async function sendTransferOtpEmail({ to, code, ticketHolderName }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your ticket transfer code: ${code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;background:#0A0A0C;color:#F5F1E8;padding:32px;border-radius:16px;">
        <p style="margin:0 0 4px 0;font-family:Georgia,serif;font-size:14px;letter-spacing:2px;color:#F2B33D;text-transform:uppercase;">Sahm TicketHub</p>
        <h1 style="font-size:20px;margin:20px 0 8px 0;">Confirm your ticket transfer</h1>
        <p style="font-size:14px;color:#D8D6DE;margin:0 0 24px 0;">
          To transfer the ticket currently held by <strong>${ticketHolderName}</strong>, enter this code:
        </p>
        <p style="font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;color:#F2B33D;text-align:center;margin:0 0 24px 0;">
          ${code}
        </p>
        <p style="font-size:12px;color:#8A8993;">This code expires in ${process.env.OTP_EXPIRES_IN || 5} minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTransferredTicketEmail({
  to,
  holderName,
  eventTitle,
  eventDate,
  venue,
  reference,
  qrBuffer,
  timezone,
}) {
  const formattedDate = formatEventDate(eventDate, timezone);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `A ticket for ${eventTitle} was transferred to you`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0A0A0C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:15px;letter-spacing:3px;color:#F2B33D;text-transform:uppercase;">Sahm TicketHub</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;color:#F5F1E8;font-weight:normal;">
                You've got a ticket, ${holderName.split(" ")[0]}.
              </h1>
              <p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:13px;color:#8A8993;">
                Someone transferred this ticket to you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#141418;border:1px solid #26262C;border-radius:16px;padding:24px 28px;margin-bottom:24px;">
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Event</p>
              <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:18px;color:#F5F1E8;">${eventTitle}</p>
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Date &amp; time</p>
              <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">${formattedDate}</p>
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Venue</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">${venue}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 0 8px 0;">
              <table role="presentation" width="280" cellpadding="0" cellspacing="0" style="background:#141418;border:1px solid #26262C;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:24px;">
                    <img src="cid:transferred-ticket-qr" width="180" height="180" alt="Ticket QR code" style="display:block;border-radius:10px;background:#ffffff;padding:8px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 12px 24px 12px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8993;line-height:1.6;">
                Show this QR code at the door — it scans once. Order reference: <span style="color:#F2B33D;font-family:'Courier New',monospace;">${reference}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    attachments: [
      {
        filename: "ticket-qr.png",
        content: qrBuffer,
        cid: "transferred-ticket-qr",
      },
    ],
  });
}

export async function sendTransferConfirmationEmail({
  to,
  originalHolderName,
  newHolderName,
  eventTitle,
  eventDate,
  venue,
  reference,
  timezone,
}) {
  const formattedDate = formatEventDate(eventDate, timezone);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your ticket for ${eventTitle} was transferred`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0A0A0C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:15px;letter-spacing:3px;color:#F2B33D;text-transform:uppercase;">Sahm TicketHub</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:44px;height:44px;background:#F2B33D;border-radius:50%;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">
                    ✓
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;color:#F5F1E8;font-weight:normal;">
                Transfer complete
              </h1>
              <p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:13px;color:#8A8993;">
                Your ticket has been handed off successfully.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#141418;border:1px solid #26262C;border-radius:16px;padding:24px 28px;">
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Event</p>
              <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:18px;color:#F5F1E8;">${eventTitle}</p>
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Date &amp; time</p>
              <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">${formattedDate}</p>
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Venue</p>
              <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">${venue}</p>
              <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8A8993;text-transform:uppercase;">Transferred from → to</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#D8D6DE;">
                ${originalHolderName} <span style="color:#F2B33D;">→</span> ${newHolderName}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 12px 8px 12px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8993;line-height:1.6;">
                Your previous QR code is no longer valid. Order reference:
                <span style="color:#F2B33D;font-family:'Courier New',monospace;">${reference}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top:1px solid #26262C;padding-top:20px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5C5B63;">
                Sahm TicketHub &middot; Kaduna, Nigeria
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

// ============================================
// OTP & CONTACT EMAILS
// ============================================

export async function sendTicketLookupOtpEmail({ to, code }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your ticket lookup code: ${code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;background:#0A0A0C;color:#F5F1E8;padding:32px;border-radius:16px;">
        <p style="margin:0 0 4px 0;font-family:Georgia,serif;font-size:14px;letter-spacing:2px;color:#F2B33D;text-transform:uppercase;">Sahm TicketHub</p>
        <h1 style="font-size:20px;margin:20px 0 8px 0;">View your tickets</h1>
        <p style="font-size:14px;color:#D8D6DE;margin:0 0 24px 0;">
          Enter this code to see all tickets bought with this email:
        </p>
        <p style="font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;color:#F2B33D;text-align:center;margin:0 0 24px 0;">
          ${code}
        </p>
        <p style="font-size:12px;color:#8A8993;">This code expires in ${process.env.OTP_EXPIRES_IN || 5} minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendContactNotification({ name, email, message }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `New contact form message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
}

// ============================================
// REFUND EMAILS
// ============================================

// Updated function with additional fields
export async function sendRefundRequestEmail({
  to,
  orderId,
  amount,
  reason,
  additionalInfo,
  proofUrl,
  userEmail,
  userName,
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">New Refund Request</h1>
      <p style="color: #D8D6DE;">A new refund request has been submitted.</p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Amount:</strong> ${formatMoney(amount)}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Additional Info:</strong> ${additionalInfo || "None provided"}</p>
        <p><strong>User:</strong> ${userName || userEmail} (${userEmail})</p>
        ${proofUrl ? `<p><strong>Proof:</strong> <a href="${proofUrl}" style="color: #F2B33D;">View Proof</a></p>` : ''}
      </div>
      <a href="https://yourdomain.com/admin/refunds" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        Review Refund Request
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `New Refund Request - Order ${orderId}`,
    html,
  });
}

export async function sendRefundConfirmationEmail({ to, orderId, amount, refundReference, walletBalance }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Refund Approved</h1>
      <p style="color: #D8D6DE;">Your refund has been approved and credited to your Sahm wallet.</p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Refund Amount:</strong> ${formatMoney(amount)}</p>
        <p><strong>Refund Reference:</strong> ${refundReference}</p>
        ${walletBalance !== undefined ? `<p><strong>New Wallet Balance:</strong> ${formatMoney(walletBalance)}</p>` : ''}
        <p style="color: #8A8993; font-size: 12px; margin-top: 10px;">
          The refund is now in your wallet and can be used for future purchases on Sahm TicketHub.
        </p>
      </div>
      <a href="https://yourdomain.com/wallet" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        View Wallet
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your Refund for Order ${orderId} Has Been Approved`,
    html,
  });
}

export async function sendRefundRejectedEmail({ to, orderId, reason }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Refund Request Update</h1>
      <p style="color: #D8D6DE;">Your refund request has been reviewed.</p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Status:</strong> Rejected</p>
        <p><strong>Reason for rejection:</strong> ${reason}</p>
        <p style="color: #8A8993; font-size: 12px; margin-top: 10px;">
          If you have questions, please contact support.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Refund Request for Order ${orderId} - Status Update`,
    html,
  });
}

// ============================================
// WAITLIST EMAILS
// ============================================

export async function sendWaitlistNotification({ to, name, eventTitle, eventId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Tickets Available!</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${eventTitle}</h2>
      <p style="color: #D8D6DE;">
        Hi ${name},<br><br>
        Good news! Tickets for ${eventTitle} are now available.<br>
        You were on the waitlist, so we wanted to let you know first.
      </p>
      <a href="https://yourdomain.com/events/${eventId}" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        Get Your Tickets Now
      </a>
      <p style="color: #8A8993; font-size: 12px; margin-top: 20px;">
        Hurry - tickets are limited!
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `🎟️ Tickets available for ${eventTitle}!`,
    html,
  });
}

export async function sendWaitlistJoinedEmail({ to, name, ticketTypeName, eventTitle }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `You're on the waitlist for ${eventTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;background:#0A0A0C;color:#F5F1E8;padding:32px;border-radius:16px;">
        <p style="margin:0 0 4px 0;font-family:Georgia,serif;font-size:14px;letter-spacing:2px;color:#F2B33D;text-transform:uppercase;">Sahm TicketHub</p>
        <h1 style="font-size:20px;margin:20px 0 8px 0;">You're on the waitlist</h1>
        <p style="font-size:14px;color:#D8D6DE;margin:0 0 16px 0;">
          Hi ${name.split(" ")[0]}, ${ticketTypeName} tickets for <strong>${eventTitle}</strong> are sold out right now.
          We'll email you the moment more become available.
        </p>
        <p style="font-size:12px;color:#8A8993;margin-top:16px;">
          Your spot is saved — no action needed.
        </p>
      </div>
    `,
  });
}

export async function sendWaitlistAvailableEmail({ to, name, ticketTypeName, eventTitle, eventSlug }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Tickets available now — ${eventTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;background:#0A0A0C;color:#F5F1E8;padding:32px;border-radius:16px;">
        <p style="margin:0 0 4px 0;font-family:Georgia,serif;font-size:14px;letter-spacing:2px;color:#F2B33D;text-transform:uppercase;">Sahm TicketHub</p>
        <h1 style="font-size:20px;margin:20px 0 8px 0;">Good news, ${name.split(" ")[0]}!</h1>
        <p style="font-size:14px;color:#D8D6DE;margin:0 0 20px 0;">
          ${ticketTypeName} tickets for <strong>${eventTitle}</strong> are available again — grab yours before they're gone.
        </p>
        <a href="https://sahmtickethub.online/events/${eventSlug}" style="display:inline-block;background:#F2B33D;color:#0A0A0C;font-weight:bold;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;">
          Get your ticket
        </a>
        <p style="font-size:12px;color:#8A8993;margin-top:20px;">
          This link will take you straight to the event page.
        </p>
      </div>
    `,
  });
}

// ============================================
// EVENT REMINDER & NEWSLETTER EMAILS
// ============================================

export async function sendEventReminderEmail({ to, eventTitle, eventDate, venue, holderName }) {
  const formattedDate = new Date(eventDate).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Event Reminder</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${eventTitle}</h2>
      <p style="color: #D8D6DE;">Don't forget! Your event is coming up soon.</p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p><strong>Date & Time:</strong> ${formattedDate}</p>
        <p><strong>Venue:</strong> ${venue}</p>
        <p><strong>Ticket Holder:</strong> ${holderName}</p>
      </div>
      <a href="https://yourdomain.com/manage-ticket" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        View Your Tickets
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Reminder: ${eventTitle} is coming up!`,
    html,
  });
}

export async function sendNewsletterEmail({ to, subject, content }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Sahm TicketHub</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${subject}</h2>
      <div style="color: #D8D6DE; line-height: 1.6;">
        ${content}
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #26262C;">
        <a href="https://yourdomain.com/unsubscribe?email=${encodeURIComponent(to)}" style="color: #8A8993; font-size: 12px;">
          Unsubscribe
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

// ============================================
// PROMO CODE EMAILS
// ============================================

export async function sendPromoCodeEmail({ to, code, discountType, discountValue, eventTitle, expiresAt }) {
  const discountDisplay = discountType === "percentage" 
    ? `${discountValue}% off` 
    : `${formatMoney(discountValue)} off`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">🎉 Exclusive Promo Code!</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${eventTitle}</h2>
      <p style="color: #D8D6DE;">Get ${discountDisplay} on your tickets!</p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-family: 'Courier New', monospace; font-size: 28px; color: #F2B33D; letter-spacing: 4px;">
          ${code}
        </p>
        ${expiresAt ? `<p style="color: #8A8993; font-size: 12px; margin-top: 10px;">Expires: ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
      </div>
      <a href="https://yourdomain.com/events" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        Shop Now
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `🎫 Your Promo Code for ${eventTitle}`,
    html,
  });
}

// ============================================
// INSTALLMENT & WALLET EMAILS
// ============================================

export async function sendInstallmentFailedEmail({ to, name, eventTitle, refundAmount, orderId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Installment Payment Update</h1>
      <p style="color: #D8D6DE;">
        Hi ${name},
      </p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #D8D6DE;">
          The remaining balance for <strong>${eventTitle}</strong> was not paid within the required timeframe.
        </p>
        <p style="color: #D8D6DE; margin-top: 10px;">
          Your deposit of <strong style="color: #F2B33D;">${formatMoney(refundAmount)}</strong> has been refunded to your wallet.
        </p>
        <p style="color: #8A8993; font-size: 12px; margin-top: 10px;">
          You can use this balance to purchase tickets for other events.
        </p>
      </div>
      <a href="https://yourdomain.com/wallet" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        View Wallet
      </a>
      <p style="color: #8A8993; font-size: 12px; margin-top: 20px;">
        Order reference: ${orderId}
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Installment Payment Failed - ${eventTitle}`,
    html,
  });
}

export async function sendWalletCreditEmail({ to, name, amount, description, balance }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Wallet Credited</h1>
      <p style="color: #D8D6DE;">
        Hi ${name},
      </p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #D8D6DE;">
          <strong style="color: #F2B33D;">${formatMoney(amount)}</strong> has been added to your wallet.
        </p>
        <p style="color: #8A8993; font-size: 12px; margin-top: 10px;">
          ${description || "Wallet funding"}
        </p>
        <p style="color: #D8D6DE; margin-top: 10px;">
          New balance: <strong style="color: #F2B33D;">${formatMoney(balance)}</strong>
        </p>
      </div>
      <a href="https://yourdomain.com/wallet" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        View Wallet
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Wallet Credited - ${formatMoney(amount)}`,
    html,
  });
}

export async function sendWalletDebitEmail({ to, name, amount, description, balance }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Wallet Debited</h1>
      <p style="color: #D8D6DE;">
        Hi ${name},
      </p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #D8D6DE;">
          <strong style="color: #F2B33D;">${formatMoney(amount)}</strong> has been deducted from your wallet.
        </p>
        <p style="color: #8A8993; font-size: 12px; margin-top: 10px;">
          ${description || "Purchase payment"}
        </p>
        <p style="color: #D8D6DE; margin-top: 10px;">
          New balance: <strong style="color: #F2B33D;">${formatMoney(balance)}</strong>
        </p>
      </div>
      <a href="https://yourdomain.com/wallet" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        View Wallet
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Wallet Debited - ${formatMoney(amount)}`,
    html,
  });
}