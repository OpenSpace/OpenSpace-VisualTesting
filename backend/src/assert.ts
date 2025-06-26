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

import { Config } from "./configuration";
import { WebClient } from "@slack/web-api";



/**
 * A more sophisticated version of console.assert. It checks the state of the provided
 * `condition`. If it is `true`, this function does nothing. If it is false, it will print
 * an error message to the log and if the Slack integration is configured, it will also
 * print a message to the provided channel.
 *
 * @param condition The condition that should be checked
 * @param message The message that will be printed if the @param condition is `false`
 */
export function assert(condition: boolean, message: string) {
  if (condition)  return;

  console.error(`Assertion failed: ${message}`);

  if (Config.slackToken != "") {
    const web = new WebClient(Config.slackToken);

    (async () => {
      const response = await web.chat.postMessage({
        channel: Config.slackChannel,
        text: message
      });
      console.log(response);
    })();
  }
}
