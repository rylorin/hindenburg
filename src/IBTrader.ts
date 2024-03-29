import {
  BarSizeSetting,
  Contract,
  IBApiNext,
  IBApiNextError,
  IBApiTickType,
  MarketDataType,
  Order,
  OrderAction,
  OrderType,
  SecType,
  TickType,
  TimeInForce,
} from "@stoqey/ib";
import { IConfig } from "config";
import { Subscription } from "rxjs";

/**
 * Convert listing exchange (Hindenburg) to primary exchange (IB)
 * Non existent entries are unchanged
 */
const listingExchangeMap: Record<string, string> = {
  ["SWX"]: "EBS",
  ["NASDAQ"]: "SMART",
};

/**
 * Convert primary exchange to exchange
 * Non existing entries are converted to SMART
 */
const exchangeMap: Record<string, string> = {
  ["WSE"]: "WSE",
};

export class IBTrader {
  protected config: IConfig;

  /** The [[IBApiNext]] instance. */
  protected api: IBApiNext;

  /** The subscription on the IBApi errors. */
  protected error$: Subscription;

  /** Connect to TWS. */
  constructor(config: IConfig) {
    this.config = config;
    // create the IBApiNext object
    const host: string = this.config.get("IBtrader.ibgw_host") || "localhost";
    const port: number = this.config.get("IBtrader.ibgw_port") || 4002;
    const reconnectInterval = 10000;
    console.log("IBApiNext", host, port);
    this.api = new IBApiNext({
      reconnectInterval,
      host,
      port,
    });
    this.api.setMarketDataType(MarketDataType.DELAYED_FROZEN);

    // log generic errors (reqId = -1) and exit with failure code
    this.error$ = this.api.errorSubject.subscribe((error) => {
      if (error.reqId === -1) {
        console.warn(`${error.error.message} (Error #${error.code})`);
      } else {
        console.error(
          `[${error.reqId}] ${error.error.message} (Error #${error.code}) ${
            error.advancedOrderReject ?
              JSON.stringify(error.advancedOrderReject)
            : ""
          }`,
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

  private getContract(exchange: string, symbol: string): Promise<Contract> {
    let contract: Contract = {
      secType: SecType.STK,
      primaryExch: listingExchangeMap[exchange] || exchange,
      symbol,
    };
    return this.api
      .getContractDetails(contract)
      .then((detailstab) => {
        if (detailstab.length >= 1) {
          contract = detailstab[0]?.contract;
        }
        contract.exchange = exchangeMap[contract.primaryExch!] || "SMART";
        return contract;
      })
      .finally(() => console.log("getContractDetails done:", contract));
  }

  private getBarPrice(
    contract: Contract,
  ): Promise<{ contract: Contract; price: number | undefined }> {
    return this.api
      .getHistoricalData(
        contract,
        undefined,
        "30 S",
        BarSizeSetting.SECONDS_ONE,
        "TRADES",
        0,
        2,
      )
      .then((bars) => {
        const price: number | undefined = bars.at(-1)?.close;
        console.log("price", price);
        return { contract, price };
      });
  }

  private getSnapshotPrice(
    contract: Contract,
  ): Promise<{ contract: Contract; price: number | undefined }> {
    return this.api
      .getMarketDataSnapshot(contract, "", false)
      .then((marketData) => {
        let price: number | undefined;
        let bid: number | undefined;
        let ask: number | undefined;
        let previousClosePrice: number | undefined;
        marketData.forEach((tick, type: TickType) => {
          if (tick.value)
            if (
              type == IBApiTickType.LAST ||
              type == IBApiTickType.DELAYED_LAST
            ) {
              price = (tick.value as number) > 0 ? tick.value : undefined;
            } else if (
              type == IBApiTickType.BID ||
              type == IBApiTickType.DELAYED_BID
            ) {
              bid = (tick.value as number) > 0 ? tick.value : undefined;
            } else if (
              type == IBApiTickType.ASK ||
              type == IBApiTickType.DELAYED_ASK
            ) {
              ask = (tick.value as number) > 0 ? tick.value : undefined;
            } else if (
              type == IBApiTickType.CLOSE ||
              type == IBApiTickType.DELAYED_CLOSE
            ) {
              previousClosePrice =
                (tick.value as number) > 0 ? tick.value : undefined;
            }
        });
        if (ask && bid) price = (ask + bid) / 2;
        else if (!price) price = previousClosePrice;
        console.log("price:", price);
        return { contract, price };
      })
      .catch((err: IBApiNextError) => {
        console.error(
          "IBTrader.getMarketDataSnapshot failed",
          err.error.message,
        );
        return { contract, price: undefined };
      })
      .finally(() => console.log("getMarketDataSnapshot done"));
  }

  private placeNewOrder(
    contract: Contract,
    price: number | undefined,
  ): Promise<number> {
    let totalQuantity: number = this.config.get("IBtrader.order_quantity") || 1;
    const totalAmount: number = this.config.get("IBtrader.order_amount");
    if (totalAmount && price) totalQuantity = Math.round(totalAmount / price);
    const order: Order = {
      action: OrderAction.SELL,
      orderType: OrderType.MKT,
      totalQuantity,
      tif: TimeInForce.DAY,
      outsideRth: true,
      transmit: true,
    };
    return this.api.placeNewOrder(contract, order);
  }

  public placeOrder(ticker: string): Promise<void> {
    console.log("IBTrader.placeOrder", ticker);
    const [exchange, symbol] = ticker.split(":");
    return this.getContract(exchange, symbol)
      .then((contract) => this.getSnapshotPrice(contract))
      .then(({ contract, price }) => this.placeNewOrder(contract, price))
      .then((orderId: number) => {
        console.log("Order placed, id:", orderId, "for", ticker);
      })
      .catch((err: IBApiNextError) => {
        console.error("IBTrader.placeOrder failed", err.error.message);
      });
  }
}
