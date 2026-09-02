/* Entry point for `node --import`. Registers the "@/*" resolver so unit tests
   can import project modules exactly as the app does. */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./alias-hooks.mjs", pathToFileURL("./test/"));
