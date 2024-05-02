import fs from "fs";
import { z } from "zod";


const ConfigurationSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  comparisonThreshold: z.number().min(0).max(1),
  adminToken: z.string().min(1),
  data: z.string().min(1),
  runners: z.array(z.string().min(1))
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
    this.comparisonThreshold = config.comparisonThreshold;
    this.adminToken = config.adminToken;
    this.data = config.data;
    this.runners = config.runners;
  }

  // The port at which the server is available
  port: number;

  // The comparison threshold that the image comparison is using to detect changes
  comparisonThreshold: number;

  // A token that has to be sent in the header to be able to invalidate references
  adminToken: string;

  // The path to where the test result data and images are being stored
  data: string;

  // The list of ids for runners that are allowed to submit tests
  runners: string[];
}

export function loadConfiguration(path: string) {
  Config = new Configuration(path);
}

export let Config: Configuration;
