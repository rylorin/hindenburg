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
    if (
      email.from.text == '"Hindenburg Research" <info@hindenburgresearch.com>'
    ) {
      const disclosureStart = email.text.indexOf("Initial Disclosure:");
      const disclosureEnd = email.text.indexOf("\n", disclosureStart);
      const disclosure = email.text.slice(disclosureStart, disclosureEnd);
      console.log("Hindenburg disclosure", disclosure);
    } else {
      console.log("MyTradingBotApp.processMail", email);
      // Forward email
      this.smtpClient.forwardEmail(email);
    }
  }
}

const app = new MyTradingBotApp();
app.start();
