/*
   Unused at the moment
*/
import dotenv from "dotenv";
dotenv.config(); // eslint-disable-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call

export class Config {
  public readonly rcpt_to: string;
  public readonly smtp_relay: string;

  constructor() {
    // Default values
    this.rcpt_to = "to be defined";
    this.smtp_relay = "localhost";

    // Todo: read the content of a JSON config file

    // Get values from env
    Object.keys(this).forEach((key) => {
      const envKey = key.toUpperCase();
      if (process.env[envKey])
        Object.defineProperty(this, key, {
          value: process.env[envKey],
          enumerable: true,
        });
    });

    console.log(Object.entries(this));
  }
}
