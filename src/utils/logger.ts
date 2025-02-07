import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";

class Logger {
  private logger: winston.Logger;

  constructor(functionName: string) {
    this.logger = winston.createLogger({
      level: "info",
      transports: [
        new winston.transports.Console(),
        new WinstonCloudWatch({
          logGroupName: `/aws/lambda/${functionName}`, // Dynamic log group
          awsRegion: process.env.AWS_REGION || "eu-central-1",
          jsonMessage: true,
        }),
      ],
    });

    // Handle errors in logging
    this.logger.on("error", (error) => {
      console.error("Error in logger:", error);
    });
  }

  public setLogLevel(level: string) {
    this.logger.level = level;
  }

  public info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  public error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  public debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}

export default Logger;
