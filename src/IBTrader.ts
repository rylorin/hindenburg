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
  WhatToShow,
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

/**
 * Convert Date to string format YYYYMMDD HH:MM:SS
 * @param date Date to convert
 * @returns Date converted as a string
 */
const dateToString = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const value = new Date(date.valueOf() + offset * 60 * 1_000);
  // convert Date to YYYYMMDD HH:MM:SS
  const day: number = value.getDate();
  const month: number = value.getMonth() + 1;
  const year: number = value.getFullYear();
  const hours: number = value.getHours();
  const minutes: number = value.getMinutes();
  const seconds: number = value.getSeconds();
  const result: string =
    year.toString() +
    (month < 10 ? "0" + month : month) +
    (day < 10 ? "0" + day : day);
  const time: string =
    (hours < 10 ? "0" + hours : hours) +
    ":" +
    (minutes < 10 ? "0" + minutes : minutes) +
    ":" +
    (seconds < 10 ? "0" + seconds : seconds);
  return result + " " + time;
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

  private async getContract(
    exchange: string,
    symbol: string,
  ): Promise<Contract> {
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

  private async getBarPrice(
    contract: Contract,
  ): Promise<{ contract: Contract; price: number | undefined }> {
    const date_to = Date.now() - 30 * 60_000;
    return this.api
      .getHistoricalData(
        contract,
        dateToString(new Date(date_to)),
        "30 S",
        BarSizeSetting.SECONDS_ONE,
        WhatToShow.MIDPOINT,
        0,
        2,
      )
      .then((bars) => {
        const price: number | undefined = bars.at(-1)?.close;
        console.log("price", price);
        return { contract, price };
      })
      .catch((err: IBApiNextError) => {
        console.error("IBTrader.getBarPrice failed", err.error.message);
        return { contract, price: undefined };
      })
      .finally(() => console.log("getBarPrice done"));
  }

  private async getSnapshotPrice(
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

  private async placeNewOrder(
    contract: Contract,
    price: number | undefined,
  ): Promise<number> {
    let totalQuantity: number = this.config.get("IBtrader.order_quantity") || 1;
    const totalAmount: number = this.config.get("IBtrader.order_amount");
    if (totalAmount && price) totalQuantity = Math.round(totalAmount / price);
    const order: Order = {
      action: OrderAction.SELL,
      orderType: price ? OrderType.STP_LMT : OrderType.MKT,
      auxPrice: price ? Math.round(price * 100) / 100 : undefined,
      lmtPrice: price ? Math.round(price * 93) / 100 : undefined,
      totalQuantity,
      tif: TimeInForce.DAY,
      outsideRth: true,
      overridePercentageConstraints: true,
      transmit: true,
    };
    return this.api.placeNewOrder(contract, order);
  }

  public async placeOrder(ticker: string): Promise<void> {
    console.log("IBTrader.placeOrder", ticker);
    const [exchange, symbol] = ticker.split(":");
    return this.getContract(exchange, symbol)
      .then(async (contract) => this.getSnapshotPrice(contract))
      .then(async ({ contract, price }) =>
        price ? { contract, price } : this.getBarPrice(contract),
      )
      .then(async ({ contract, price }) => this.placeNewOrder(contract, price))
      .then((orderId: number) => {
        console.log("Order placed, id:", orderId, "for", ticker);
      })
      .catch((err: IBApiNextError) => {
        console.error("IBTrader.placeOrder failed", err.error.message);
      });
  }
}
