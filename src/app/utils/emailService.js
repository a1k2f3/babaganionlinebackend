import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use your preferred service (SendGrid, Mailgun, etc.)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Thank you email to guest
export const sendGuestThankYouEmail = async (order) => {
  const itemsList = order.items.map(item => 
    `• ${item.title} (${item.size || 'N/A'}) x${item.quantity} - ₹${item.price}`
  ).join('\n');

  const mailOptions = {
    from: `"Your Store Name" <${process.env.EMAIL_USER}>`,
    to: order.guestInfo.email,
    subject: `Thank You for Your Order! #${order._id}`,
    html: `
      <h2>Thank you for shopping with us!</h2>
      <p>Dear ${order.guestInfo.name || 'Valued Customer'},</p>
      <p>Your order has been received successfully.</p>
      
      <h3>Order Details:</h3>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Tracking Token:</strong> ${order.trackingToken}</p>
      <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
      
      <h4>Items:</h4>
      <pre>${itemsList}</pre>
      
      <p>You can track your order using the tracking token above.</p>
      <p>Thank you for choosing us!</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// New order alert to admin
export const sendNewOrderNotificationToAdmin = async (order) => {
  const mailOptions = {
    from: `"Your Store Name" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL, // e.g. admin@yourstore.com
    subject: `🛒 New Guest Order Received - #${order._id}`,
    html: `
      <h2>New Guest Order Received</h2>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Customer:</strong> ${order.guestInfo.name || 'Guest'} (${order.guestInfo.email})</p>
      <p><strong>Phone:</strong> ${order.guestInfo.phone}</p>
      <p><strong>Total:</strong> ₹${order.totalAmount}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      
      <p>Check the admin panel for full details.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};