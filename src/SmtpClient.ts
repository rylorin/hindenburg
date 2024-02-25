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
    });
  }

  public async forwardEmail(email: Record<string, any>) {
    const info = await this.transporter.sendMail({
      from: '"Fred Foo 👻" <foo@example.com>', // sender address
      to: "rylorin@gmail.com", // list of receivers
      subject: email.subject, // Subject line
      text: email.text, // plain text body
      html: email.textAsHtml, // html body
    });

    console.error("Message sent: %s", info.messageId);
  }
}
