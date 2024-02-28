import {
  BarSizeSetting,
  Contract,
  IBApiNext,
  IBApiNextError,
  MarketDataType,
  Order,
  OrderAction,
  OrderType,
  SecType,
  TimeInForce,
} from "@stoqey/ib";
import { Subscription } from "rxjs";

const _exchangeMap: Record<string, string> = {
  // ["SWX"]: "EBS",
  ["SWX"]: "SMART",
  ["NASDAQ"]: "SMART",
};

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

  public placeOrder(ticker: string): Promise<void> {
    console.log("IBTrader.placeOrder", ticker);
    const [exchange, symbol] = ticker.split(":");
    let contract: Contract = {
      secType: SecType.STK,
      // exchange: exchangeMap[exchange] || exchange,
      exchange: "SMART",
      symbol,
    };
    return this.api
      .getContractDetails(contract)
      .then((detailstab) => {
        if (detailstab.length >= 1) {
          contract = detailstab[0]?.contract;
          console.log("got contract details", contract);
          return this.api
            .getHistoricalData(
              contract,
              undefined,
              "30 S",
              BarSizeSetting.SECONDS_ONE,
              "TRADES",
              0,
              2
            )
            .then((bars) => {
              // console.log("got historical data", bars);
              const price: number | undefined = bars.at(-1)?.close;
              console.log("price", price);
              return { contract, price };
            });
        } else {
          throw "Contract details not found";
        }
      })
      .then(({ contract, price }) => {
        let totalQuantity = 100;
        if (process.env.ORDER_QUANTITY)
          totalQuantity = parseInt(process.env.ORDER_QUANTITY);
        else if (process.env.ORDER_AMOUNT)
          totalQuantity = price
            ? Math.round(parseInt(process.env.ORDER_AMOUNT) / price)
            : 100;
        const order: Order = {
          action: OrderAction.SELL,
          orderType: OrderType.MKT,
          totalQuantity,
          tif: TimeInForce.GTC,
          outsideRth: true,
          transmit: false,
        };
        return this.api.placeNewOrder(contract, order);
      })
      .then((orderId: number) => {
        console.log("Order placed, id:", orderId.toString());
      })
      .catch((err: IBApiNextError) => {
        console.error("IBTrader.placeOrder failed", contract);
      });
  }
}
