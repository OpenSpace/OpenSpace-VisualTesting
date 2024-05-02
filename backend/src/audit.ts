import { Config } from "./configuration";
import fs from "fs";

let AuditPath: string;

export function printAudit(text: string) {
  fs.appendFileSync(AuditPath, `${new Date().toISOString()}  ${text}\n`);
}

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
