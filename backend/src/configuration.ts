/*****************************************************************************************
 *                                                                                       *
 * OpenSpace Visual Testing                                                              *
 *                                                                                       *
 * Copyright (c) 2024-2025                                                               *
 *                                                                                       *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this  *
 * software and associated documentation files (the "Software"), to deal in the Software *
 * without restriction, including without limitation the rights to use, copy, modify,    *
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to    *
 * permit persons to whom the Software is furnished to do so, subject to the following   *
 * conditions:                                                                           *
 *                                                                                       *
 * The above copyright notice and this permission notice shall be included in all copies *
 * or substantial portions of the Software.                                              *
 *                                                                                       *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,   *
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A         *
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT    *
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF  *
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE  *
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                         *
 ****************************************************************************************/

import fs from "fs";
import { z } from "zod";



/**
 * The schema describing the structure of the main configuration file.
 */
const ConfigurationSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  slack: z.object({
    token: z.string(),
    channel: z.string()
  }),
  comparisonThreshold: z.number().min(0).max(1),
  imageSize: z.object({ width: z.number().min(1), height: z.number().min(1) }),
  thumbnailScale: z.number().min(1),
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
    this.slackToken = config.slack.token;
    this.slackChannel = config.slack.channel;
    this.comparisonThreshold = config.comparisonThreshold;
    this.size = config.imageSize;
    this.thumbnailScale = config.thumbnailScale;
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

  /// The image size that all of the images must have
  size: {
    width: number,
    height: number
  };

  /// The scaling factor by which the image is reduced to produce a thumbnail
  thumbnailScale: number;

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
 * Loads the configuration file from the provided `path` and stores the results into the
 * global configuration object.
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
  const config = {
    port: Config.port,
    slack: {
      token: Config.slackToken,
      channel: Config.slackChannel
    },
    comparisonThreshold: Config.comparisonThreshold,
    imageSize: Config.size,
    thumbnailScale: Config.thumbnailScale,
    adminToken: Config.adminToken,
    data: Config.data,
    runners: Config.runners
  }
  fs.writeFileSync(Config.path, JSON.stringify(config, null, 2));
}



/**
 * The global configuration object that stores general configuration option that are used
 * in various places throughout the server.
 */
export let Config: Configuration;
