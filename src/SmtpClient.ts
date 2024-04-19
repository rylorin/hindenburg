/*
  Simple SMTP client that forward email to a defined user.

  documentation available at:
    https://nodemailer.com/about/
*/
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
    console.log("from:", email.from?.text);
    console.log("to:", email.to?.text);
    console.log("replyTo:", email.replyTo?.text);
    console.log("subject:", email.subject?.text);
    return this.transporter
      .sendMail({
        from: {
          address:
            this.config.get("SmtpClient.relay_username") ||
            email.from.value[0].address,
          name: email.from.value[0].name,
        },
        to: {
          address:
            this.config.get("SmtpClient.rcpt_to") ||
            this.config.get("SmtpClient.relay_username"),
          name: email.to?.value[0].name,
        },
        replyTo: email.replyTo?.value[0] || email.from?.value[0],
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
