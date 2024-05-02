import fs from "fs";
import { z } from "zod";


const ConfigurationSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  comparisonThreshold: z.number().min(0).max(1),
  testResultStore: z.string().min(1),
  paths: z.object({
    reference: z.string().min(1),
    candidate: z.string().min(1),
    difference: z.string().min(1)
  }),
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
    this.testResultStore = config.testResultStore;
    this.referenceImagePath = config.paths.reference;
    this.candidateImagePath = config.paths.candidate;
    this.differenceImagePath = config.paths.difference;
    this.runners = config.runners;
  }

  // The port at which the server is available
  port: number;

  // The comparison threshold that the image comparison is using to detect changes
  comparisonThreshold: number;

  // The path to the .json file that contains all of the test results
  testResultStore: string;

  // The path to the folder in which the reference image are stored. The folder specified
  // should be only used for storing reference image as this service might add, remove, or
  //overwrite files and folders within this folders.
  referenceImagePath: string;

  // The path to the folder where the test images are stored
  candidateImagePath: string;

  // The path to the folder where the comparison images are stored
  differenceImagePath: string;

  // The list of ids for runners that are allowed to submit tests
  runners: string[];
}

export function loadConfiguration(path: string) {
  Config = new Configuration(path);
}

export let Config: Configuration;
