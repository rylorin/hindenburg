import nodemailer from "nodemailer";

export class SmtpClient {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_RELAY || "localhost",
      port: 465,
      secure: true,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: process.env.RELAY_USERNAME,
        pass: process.env.RELAY_PASSWORD,
      },
      logger: true,
    });
  }

  public async forwardEmail(emailIn: Record<string, any>) {
    const emailOut = {
      from: process.env.RELAY_USERNAME || emailIn.headers.get("from").text, // sender address
      to:
        process.env.RCPT_TO ||
        emailIn.to ||
        process.env.RELAY_USERNAME ||
        "<foo@bar.com>", // list of receivers
      subject: emailIn.subject, // Subject line
      text: emailIn.text, // plain text body
      html: emailIn.html, // html body
    };
    console.log(emailOut);
    const info = await this.transporter.sendMail(emailOut);

    console.error("Message sent: %s", info.messageId);
  }
}
