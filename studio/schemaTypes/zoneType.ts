import { defineField, defineType } from "sanity";

export const zoneType = defineType({
  name: "zone",
  title: "Zone",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        slugify: (input: string) => input.toLowerCase().replace(/\s+/g, "-").slice(0, 64),
      },
      validation: (r) => r.required(),
    }),
    defineField({ name: "title", title: "Title (ZH)", type: "string", validation: (r) => r.required() }),
    defineField({ name: "title_en", title: "Title (EN)", type: "string", validation: (r) => r.required() }),
    defineField({ name: "description", title: "Description (ZH)", type: "text" }),
    defineField({ name: "description_en", title: "Description (EN)", type: "text" }),
    defineField({ name: "bgmUrl", title: "BGM URL", type: "url" }),
    defineField({ name: "ambientLoopUrl", title: "Ambient Loop URL", type: "url" }),
    defineField({
      name: "footstepMaterial",
      title: "Footstep Material",
      type: "string",
      options: {
        list: [
          { title: "Default", value: "default" },
          { title: "Wood", value: "wood" },
          { title: "Concrete", value: "concrete" },
          { title: "Carpet", value: "carpet" },
        ],
      },
      initialValue: "default",
    }),
  ],
});

