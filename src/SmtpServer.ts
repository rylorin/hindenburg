import { SMTPServer } from "smtp-server";

export class SmtpServer {
  private server;
  constructor() {
    this.server = new SMTPServer({
      authOptional: true,
      onData(stream, session, callback): void {
        stream.pipe(process.stderr); // print message to console
        stream.on("end", callback);
      },
      logger: true,
    });
  }

  public start(): void {
    this.server.listen(25);
  }
  public stop(): void {
    console.log("stop");
  }
}
