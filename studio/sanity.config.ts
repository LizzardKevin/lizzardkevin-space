import { defineConfig } from "sanity";
import { visionTool } from "@sanity/vision";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "default",
  title: "LizzardKevin's Space",

  // 这里先用占位；你创建 Sanity project 后把这两个值替换掉即可。
  projectId: "REPLACE_ME",
  dataset: "production",

  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});

