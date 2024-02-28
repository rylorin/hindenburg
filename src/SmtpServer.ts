/*
  Simple SMTP server.

  documentation available at:
    https://nodemailer.com/extras/smtp-server/
*/
import {
  SMTPServer,
  SMTPServerDataStream,
  SMTPServerSession,
} from "smtp-server";
const simpleParser = require("mailparser").simpleParser;

export class SmtpServer {
  private server: SMTPServer;

  constructor() {
    this.server = new SMTPServer({
      authOptional: true,
      size: 10 * 1024 * 1024, // 10 Mb
      disableReverseLookup: true,
      onData: (stream, session, callback) =>
        this.onData(stream, session, callback),
      logger: true,
    });
    this.server.on("error", (err) => {
      console.log("Error %s", err.message);
    });
  }

  public start(): void {
    const port = process.env.SMTPD_PORT ? parseInt(process.env.SMTPD_PORT) : 25;
    this.server.listen(port);
  }

  public stop(): void {
    console.log("stop");
  }

  protected onData(
    stream: SMTPServerDataStream,
    session: SMTPServerSession,
    callback: (err?: Error | null | undefined) => void
  ): void {
    // stream.on("end", callback);
    // stream.on("error", () => console.error("error"));
    simpleParser(stream)
      .then((email: Record<string, any>) => this.processMail(session, email))
      .then(() => callback())
      .catch((err: Error) => callback(err));
  }

  protected processMail(
    session: SMTPServerSession,
    email: Record<string, any>
  ): Promise<void> {
    console.log("processMail", session, email);
    return Promise.resolve();
  }
}
