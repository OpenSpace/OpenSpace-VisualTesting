/*****************************************************************************************
 *                                                                                       *
 * OpenSpace Visual Testing                                                              *
 *                                                                                       *
 * Copyright (c) 2024                                                                    *
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
import fs from "fs";



/**
 * The path to the file that is used to store the audit data. If it does not exist, it
 * will be created. If it already exists, the new audit data will be appended at the end.
 */
let AuditPath: string;



/**
 * Adds the provided `text` to the audit log. The line will also contain the current date
 * and time.
 *
 * @param text The line that should be added to the audit log
 */
export function printAudit(text: string) {
  console.log(text);
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
