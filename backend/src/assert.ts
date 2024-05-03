import { Config } from "./configuration";
import { WebClient } from "@slack/web-api";

/**
 * A more sophisticated version of console.assert. It checks the state of the provided
 * @param condition. If it is `true`, this function does nothing. If it is false, it will
 * print an error message to the log and if the Slack integration is configured, it will
 * also print a message to the provided channel.
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
      let response = await web.chat.postMessage({ channel: Config.slackChannel, text: message });
      console.log(response);
    })();
  }
}
