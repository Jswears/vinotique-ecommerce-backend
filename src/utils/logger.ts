import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";

class Logger {
  private logger: winston.Logger;

  constructor(functionName: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Get current date and time in a safe format
    this.logger = winston.createLogger({
      level: "info", // Set the log level
      transports: [
        new winston.transports.Console(), // Add console transport for debugging
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

  public info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  public error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }
}

export default Logger;
