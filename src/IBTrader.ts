import { IBApiNext, MarketDataType } from "@stoqey/ib";
import { Subscription } from "rxjs";

export class IBTrader {
  /** The [[IBApiNext]] instance. */
  protected api: IBApiNext;

  /** The subscription on the IBApi errors. */
  protected error$: Subscription;

  /** Connect to TWS. */
  constructor() {
    // create the IBApiNext object

    const host = process.env.IBGW_HOST || "localhost";
    const port = process.env.IBGW_PORT ? parseInt(process.env.IBGW_PORT) : 4002;
    const reconnectInterval = 10000;

    this.api = new IBApiNext({
      reconnectInterval,
      host,
      port,
    });

    // log generic errors (reqId = -1) and exit with failure code
    this.error$ = this.api.errorSubject.subscribe((error) => {
      if (error.reqId === -1) {
        console.warn(`${error.error.message} (Error #${error.code})`);
      } else {
        console.error(
          `${error.error.message} (Error #${error.code}) ${
            error.advancedOrderReject ? error.advancedOrderReject : ""
          }`
        );
      }
    });
  }

  /** app startup */
  public start(): void {
    const clientId = Math.floor(Math.random() * 32766) + 1;
    try {
      this.api.connect(clientId);
    } catch (error: any) {
      console.error(error.message);
    }
    this.api.setMarketDataType(MarketDataType.DELAYED_FROZEN);
  }

  public placeOrder(symbol: string) {}
}
