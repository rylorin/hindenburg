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

  public forwardEmail(email: Record<string, any>): Promise<void> {
    console.log("from:", email.headers.get("from"));
    console.log("to:", email.headers.get("to"));
    console.log("subject:", email.subject);
    return this.transporter
      .sendMail({
        from: process.env.RELAY_USERNAME || email.from,
        to: process.env.RCPT_TO || process.env.RELAY_USERNAME,
        subject: email.subject,
        text: email.text,
        html: email.html,
      })
      .then((info) => console.log("Message sent: %s", info.messageId))
      .catch((err: Error) => {
        console.error("error:", err);
        console.error("email:", email);
        throw err;
      });
  }
}
