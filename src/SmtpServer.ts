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
    stream.pipe(process.stderr); // print message to console
    stream.on("end", callback);
    stream.on("error", () => console.error("error"));
    simpleParser(stream).then((email: Record<string, any>) =>
      this.processMail(session, email)
    );
  }

  protected processMail(
    session: SMTPServerSession,
    email: Record<string, any>
  ): void {
    console.log("processMail", session, email);
  }
}
