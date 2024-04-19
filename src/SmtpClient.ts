/*
  Simple SMTP client that forward email to a defined user.

  documentation available at:
    https://nodemailer.com/about/
*/
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IConfig } from "config";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

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
    console.log("From:", email.from?.text);
    console.log("Reply-To:", email.replyTo?.text);
    console.log("To:", email.to?.text);
    console.log("Subject:", email.subject);
    console.log("Headers:", email.headers);
    // console.log("List-Unsubscribe:", email.headers.get("List-Unsubscribe"));
    const mailOptions: Mail.Options = {
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
      headers: [],
    };
    const headers: Mail.Headers = [];
    if (email.headers.get("list")) {
      if (email.headers.get("list")["unsubscribe"]) {
        const valuesIn = email.headers.get("list")["unsubscribe"];
        const values = Object.keys(
          email.headers.get("list")["unsubscribe"],
        ).map((key) => {
          if (key == "url") return `<${valuesIn[key]}>`;
          else if (key == "mail") return `<mailto:${valuesIn[key]}>`;
          else return valuesIn[key];
        });
        values
          .map((value) => ({ key: "List-Unsubscribe", value }))
          .forEach((item) => headers.push(item));
      }
      if (email.headers.get("list")["unsubscribe-post"]) {
        headers.push({
          key: "List-Unsubscribe-Post",
          value: email.headers.get("list")["unsubscribe-post"]["name"],
        });
      }
    }
    mailOptions.headers = headers;
    console.log("mailOptions:", mailOptions);
    return this.transporter
      .sendMail({ ...mailOptions, text: email.text, html: email.html })
      .then((info) => console.log("Message sent: %s", info.messageId))
      .catch((err: Error) => {
        console.error("error:", err);
        console.error("email:", email);
        throw err;
      });
  }
}
