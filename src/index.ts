import { IConfig } from "config";
import { IBTrader as Trader } from "./IBTrader";
import { SmtpClient } from "./SmtpClient";
import { SmtpServer } from "./SmtpServer";

type AddressType = {
  text: string;
  html: string;
  value: { name: string; address: string }[];
};

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

  private addToArray(array: string[], items: string[] | undefined): string[] {
    items?.forEach((item) => {
      const sender = item.trim();
      if (!array.includes(sender)) array.push(sender);
    });
    return array;
  }

  private getValidSenders(): string[] {
    const valid_senders: string[] = [];
    if (typeof this.config.get("valid_senders") == "string")
      this.addToArray(
        valid_senders,
        (this.config.get("valid_senders") as string).split(","),
      );
    else if (Array.isArray(this.config.get("valid_senders")))
      this.addToArray(valid_senders, this.config.get("valid_senders"));
    this.addToArray(valid_senders, process.env["VALID_SENDERS"]?.split(","));
    return valid_senders;
  }

  private isValidSender(from: AddressType): boolean {
    if (!from) return false;
    if (this.valid_senders.length) {
      console.log("isValidSender", from.value[0].address, this.valid_senders);
      return this.valid_senders.includes(from.value[0].address);
    } else
      return from.text == '"Hindenburg Research" <info@hindenburgresearch.com>';
  }

  private isValidDestinee(_to: AddressType): boolean {
    return true;
  }

  protected async processMail(
    _session: SMTPServerSession,
    email: Record<string, any>,
  ): Promise<void> {
    if (
      this.isValidSender(email.from as AddressType) &&
      this.isValidDestinee(email.to as AddressType)
    ) {
      const disclosureStart: number = (email.text as string).indexOf(
        "Initial Disclosure:",
      );
      if (disclosureStart >= 0) {
        const disclosureEnd: number = (email.text as string).indexOf(
          "\n",
          disclosureStart,
        );
        const disclosure: string = (email.text as string).slice(
          disclosureStart,
          disclosureEnd,
        );
        const pattern = new RegExp("\\([A-Z]+:[A-Z]+\\)", "g");
        const result = disclosure.match(pattern);
        console.log("Hindenburg disclosure", disclosure, result);
        if (result?.length)
          this.trader.placeOrder(result[0].slice(1, -1)).catch((err: Error) => {
            console.error("placeOrder failed", err);
          });
      }
    }
    // Forward email
    return this.smtpClient.forwardEmail(email);
  }
}

import config from "config";
import dotenv from "dotenv";
import { SMTPServerSession } from "smtp-server";
dotenv.config();  

console.log("NODE_ENV", process.env["NODE_ENV"]);
// const config = new Config();
const app = new MyTradingBotApp(config);
app.start();
