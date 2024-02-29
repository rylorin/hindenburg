import dotenv from "dotenv";
dotenv.config(); // eslint-disable-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call

import { SMTPServerSession } from "smtp-server";
import { IBTrader as Trader } from "./IBTrader";
import { SmtpClient } from "./SmtpClient";
import { SmtpServer } from "./SmtpServer";

const getValidSenders = (): string[] => {
  if (process.env.VALID_SENDERS)
    return process.env.VALID_SENDERS.split(",").map((item) => item.trim());
  else return [];
};

export class MyTradingBotApp extends SmtpServer {
  private smtpClient;
  private trader;
  private valid_senders: string[];

  constructor() {
    super();
    this.valid_senders = getValidSenders();
    this.smtpClient = new SmtpClient();
    this.trader = new Trader();
  }

  public start(): void {
    this.trader.start();
    super.start();
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

const app = new MyTradingBotApp();
app.start();
