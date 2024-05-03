import { Config } from "./configuration";
import fs from "fs";

/**
 * The path to the file that is used to store the audit data. If it does not exist, it
 * will be created. If it already exists, the new audit data will be appended at the end.
 */
let AuditPath: string;

/**
 * Adds the provided @param text to the audit log. The line will also contain the current
 * date and time.
 *
 * @param text The line that should be added to the audit log
 */
export function printAudit(text: string) {
  fs.appendFileSync(AuditPath, `${new Date().toISOString()}  ${text}\n`);
}

/**
 * Initializes the file containing the audit log. This will either create the file if it
 * does not exist, or add newlines to the existing file to separate the new audit messages
 * from previous runs.
 */
export function initializeAudit() {
  AuditPath = `${Config.data}/audit.txt`;

  if (fs.existsSync(AuditPath)) {
    fs.appendFileSync(AuditPath, "\n\n");
  }
  else {
    fs.writeFileSync(AuditPath, `${new Date().toISOString()}  Creating file\n`);
  }

  printAudit("Starting testing server");
}
