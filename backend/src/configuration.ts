import fs from "fs";
import { z } from "zod";

/**
 * The schema describing the structure of the main configuration file
 */
const ConfigurationSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  slack: z.object({
    token: z.string(),
    channel: z.string()
  }),
  comparisonThreshold: z.number().min(0).max(1),
  adminToken: z.string().min(1),
  data: z.string().min(1),
  runners: z.array(z.string().min(1)),
  path: z.string().optional()
}).strict();

class Configuration {
  constructor(configFile: string) {
    const data = JSON.parse(fs.readFileSync(configFile).toString());
    const res = ConfigurationSchema.safeParse(data);

    if (!res.success) {
      console.error(res.error.issues);
      process.exit();
    }

    const config = res.data;
    this.port = config.port;
    this.slackToken = config.slack.token;
    this.slackChannel = config.slack.channel;
    this.comparisonThreshold = config.comparisonThreshold;
    this.adminToken = config.adminToken;
    this.data = config.data;
    this.runners = config.runners;
    this.path = configFile;
  }

  /// The port at which the server is available
  port: number;

  /// The token that is used to authenticate against Slack to be able to send messages
  slackToken: string;

  /// The channel ID to which messages are posted if a `slackToken` is provided
  slackChannel: string;

  /// The comparison threshold that the image comparison is using to detect changes
  comparisonThreshold: number;

  /// A token that has to be sent in the header to be able to invalidate references
  adminToken: string;

  /// The path to where the test result data and images are being stored
  data: string;

  /// The list of ids for runners that are allowed to submit tests
  runners: string[];

  /// The path to where the configuration file lives
  path: string;
}

/**
 * Loads the configuration file from the provided @param path and stores the results into
 * the global configuration object.
 *
 * @param path The path from which to load the configuration
 */
export function loadConfiguration(path: string) {
  Config = new Configuration(path);
}

/**
 * Updates the configuration file on disk that was used to originally load the global
 * configuration.
 */
export function saveConfiguration() {
  fs.writeFileSync(Config.path, JSON.stringify(Config, null, 2));
}

/**
 * The global configuration object that stores general configuration option that are used
 * in various places throughout the server
 */
export let Config: Configuration;
