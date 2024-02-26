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

  protected fireOrder(symbol: string) {
    console.log("MyTradingBotApp.fireOrder", symbol);
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
      // const pattern = new RegExp(
      //   "Initial Disclosure: After extensive research, we have taken a short position in shares of .* ([A-Z]*:[A-Z]*)",
      //   "i"
      // );
      const pattern = new RegExp("\\([A-Z]+:[A-Z]+\\)", "g");
      const result = disclosure.match(pattern);
      console.log("Hindenburg disclosure", disclosure, result);
      if (result.length) this.fireOrder(result[0].slice(1, -1));
    } else {
      console.log("MyTradingBotApp.processMail", email);
      // Forward email
      this.smtpClient.forwardEmail(email);
    }
  }
}

const app = new MyTradingBotApp();
app.start();
