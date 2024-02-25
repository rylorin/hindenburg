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

  public processMail(): void {
    console.log("processMail");
  }
}

const app = new MyTradingBotApp();
app.start();
