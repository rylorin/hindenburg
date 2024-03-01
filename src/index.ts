import { IConfig } from "config";
import { SMTPServerSession } from "smtp-server";
import { IBTrader as Trader } from "./IBTrader";
import { SmtpClient } from "./SmtpClient";
import { SmtpServer } from "./SmtpServer";

export class MyTradingBotApp extends SmtpServer {
  protected config: IConfig;
  private smtpClient;
  private trader;
  private valid_senders: string[];

  constructor(config: IConfig) {
    super(config);
    this.config = config;
    this.valid_senders = this.getValidSenders();
    this.smtpClient = new SmtpClient(config);
    this.trader = new Trader(config);
  }

  public start(): void {
    this.trader.start();
    super.start();
  }

  private getValidSenders(): string[] {
    const valid_senders = this.config.get("valid_senders");
    if (typeof valid_senders == "string")
      return valid_senders.split(",").map((item) => item.trim());
    else if (valid_senders) return valid_senders as string[];
    else return [];
  }

  private isValidSender(from: {
    text: string;
    html: string;
    value: { name: string; address: string }[];
  }): boolean {
    if (!from) return false;
    if (this.valid_senders.length) {
      console.log("isValidSender", from.value[0].address, this.valid_senders);
      return this.valid_senders.includes(from.value[0].address);
    } else
      return from.text == '"Hindenburg Research" <info@hindenburgresearch.com>';
  }

  private isValidDestinee(_to: {
    text: string;
    html: string;
    value: { name: string; address: string }[];
  }): boolean {
    return true;
  }

  protected processMail(
    _session: SMTPServerSession,
    email: Record<string, any>
  ): Promise<void> {
    if (this.isValidSender(email.from) && this.isValidDestinee(email.to)) {
      const disclosureStart = email.text.indexOf("Initial Disclosure:");
      if (disclosureStart >= 0) {
        const disclosureEnd = email.text.indexOf("\n", disclosureStart);
        const disclosure = email.text.slice(disclosureStart, disclosureEnd);
        const pattern = new RegExp("\\([A-Z]+:[A-Z]+\\)", "g");
        const result = disclosure.match(pattern);
        console.log("Hindenburg disclosure", disclosure, result);
        if (result.length) this.trader.placeOrder(result[0].slice(1, -1));
      }
    }
    // Forward email
    return this.smtpClient.forwardEmail(email);
  }
}

import config from "config";
import dotenv from "dotenv";
dotenv.config(); // eslint-disable-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call

console.log("env", process.env["NODE_ENV"]);
// const config = new Config();
const app = new MyTradingBotApp(config);
app.start();
