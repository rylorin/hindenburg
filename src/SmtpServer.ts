/*
  Simple SMTP server.

  documentation available at:
    https://nodemailer.com/extras/smtp-server/
*/
import { IConfig } from "config";
import {
  SMTPServer,
  SMTPServerDataStream,
  SMTPServerSession,
} from "smtp-server";

const simpleParser = require("mailparser").simpleParser;

export class SmtpServer {
  private server: SMTPServer;
  protected config: IConfig;

  constructor(config: IConfig) {
    this.config = config;
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
    const port = this.config.get("SmtpServer.smtpd_port") || 25;
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
