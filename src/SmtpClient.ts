/*
  Simple SMTP client that forward email to a defined user.

  documentation available at:
    https://nodemailer.com/about/
*/
import { IConfig } from "config";
import nodemailer from "nodemailer";

export class SmtpClient {
  private transporter;
  protected config: IConfig;

  constructor(config: IConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: this.config.get("SmtpClient.smtp_relay"),
      port: 465,
      secure: true,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: this.config.get("SmtpClient.relay_username"),
        pass: this.config.get("SmtpClient.relay_password"),
      },
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: true,
    });
  }

  public forwardEmail(email: Record<string, any>): Promise<void> {
    console.log("from:", email.headers.get("from")?.text);
    console.log("to:", email.headers.get("to")?.text);
    console.log("subject:", email.subject);
    return this.transporter
      .sendMail({
        from: this.config.get("SmtpClient.relay_username") || email.from,
        to:
          this.config.get("SmtpClient.rcpt_to") ||
          this.config.get("SmtpClient.relay_username"),
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
