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
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: true,
    });
  }

  public async forwardEmail(email: Record<string, any>) {
    // We need to change "from" to get mail accepted from gateway
    if (process.env.RELAY_USERNAME) email.from = process.env.RELAY_USERNAME;
    // We need to change "to" or mail will loop back
    email.to =
      process.env.RCPT_TO || process.env.RELAY_USERNAME || "<foo@bar.com>";
    // console.log(email);
    const info = await this.transporter.sendMail(email);

    console.log("Message sent: %s", info.messageId);
  }
}
