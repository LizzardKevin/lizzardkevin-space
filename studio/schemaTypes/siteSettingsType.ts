import { defineField, defineType } from "sanity";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "defaultLanguage", title: "Default Language", type: "string", options: { list: ["zh", "en"] }, initialValue: "zh" }),
    defineField({
      name: "defaultVolumes",
      title: "Default Volumes",
      type: "object",
      fields: [
        defineField({ name: "master", type: "number", initialValue: 0.9 }),
        defineField({ name: "bgm", type: "number", initialValue: 0.6 }),
        defineField({ name: "ambient", type: "number", initialValue: 0.6 }),
        defineField({ name: "sfx", type: "number", initialValue: 0.35 }),
        defineField({ name: "exhibit", type: "number", initialValue: 0.8 }),
      ],
    }),
    defineField({
      name: "aboutBlocks",
      title: "About Blocks",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "links",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", type: "string" }),
            defineField({ name: "url", type: "url" }),
          ],
        },
      ],
    }),
  ],
});

