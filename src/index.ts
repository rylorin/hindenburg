import dotenv from "dotenv";
dotenv.config(); // eslint-disable-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call

import { SMTPServerSession } from "smtp-server";
import { IBTrader as Trader } from "./IBTrader";
import { SmtpClient } from "./SmtpClient";
import { SmtpServer } from "./SmtpServer";

export class MyTradingBotApp extends SmtpServer {
  private smtpClient;
  private trader;

  constructor() {
    super();
    this.smtpClient = new SmtpClient();
    this.trader = new Trader();
  }

  public start(): void {
    super.start();
  }

  protected processMail(
    _session: SMTPServerSession,
    email: Record<string, any>
  ): void {
    console.log("processMail", email);
    this.smtpClient.forwardEmail(email);
  }
}

const app = new MyTradingBotApp();
app.start();
