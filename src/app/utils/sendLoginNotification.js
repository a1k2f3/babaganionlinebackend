import nodemailer from 'nodemailer';

const sendLoginNotification = async (adminName, adminEmail, loginTime, ip = 'unknown') => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Security Alert" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_NOTIFY_EMAIL || adminEmail,
      subject: `Admin Login Detected — ${adminName}`,
      html: `
        <h2>Security Notification</h2>
        <p>Hi ${adminName},</p>
        <p>A login to your admin account was just detected:</p>
        <ul>
          <li><b>Time:</b> ${loginTime.toLocaleString()}</li>
          <li><b>IP:</b> ${ip}</li>
        </ul>
        <p><strong>Was this you?</strong></p>
        <p>→ If yes: everything is fine.</p>
        <p>→ If no: <b>change your password immediately</b> and consider enabling 2FA.</p>
        <br>
        <small>— Your App Security</small>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login alert sent to ${process.env.ADMIN_NOTIFY_EMAIL}`);
  } catch (err) {
    console.error('Login email failed:', err.message);
  }
};

export default sendLoginNotification;