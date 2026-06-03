import { defineField, defineType } from "sanity";

export const exhibitType = defineType({
  name: "exhibit",
  title: "Exhibit",
  type: "document",
  fields: [
    defineField({ name: "zone", title: "Zone", type: "reference", to: [{ type: "zone" }], validation: (r) => r.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "hoverLabel" }, validation: (r) => r.required() }),
    defineField({ name: "exhibitType", title: "Type", type: "string", options: { list: ["model3d", "image", "audio", "video"] }, validation: (r) => r.required() }),

    defineField({ name: "hoverLabel", title: "Hover Label (ZH)", type: "string", validation: (r) => r.required() }),
    defineField({ name: "hoverLabel_en", title: "Hover Label (EN)", type: "string" }),

    defineField({ name: "title", title: "Title (ZH)", type: "string" }),
    defineField({ name: "title_en", title: "Title (EN)", type: "string" }),
    defineField({ name: "body", title: "Body (ZH)", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "body_en", title: "Body (EN)", type: "array", of: [{ type: "block" }] }),

    defineField({
      name: "sceneObjectName",
      title: "Scene Object Name",
      description: "必须与 .glb 内可交互 mesh 名一致（例如 exhibit_band_bass）",
      type: "string",
      validation: (r) => r.required(),
    }),

    defineField({ name: "modelUrl", title: "Model URL (.glb)", type: "url" }),
    defineField({ name: "imageUrl", title: "Image URL", type: "url" }),
    defineField({ name: "audioUrl", title: "Audio URL (.mp3)", type: "url" }),
    defineField({ name: "videoUrl", title: "Video URL (.mp4)", type: "url" }),
    defineField({ name: "videoEmbed", title: "Video Embed URL", type: "url" }),

    defineField({
      name: "focusCameraOffset",
      title: "Focus Camera Offset",
      type: "object",
      fields: [
        defineField({ name: "x", type: "number" }),
        defineField({ name: "y", type: "number" }),
        defineField({ name: "z", type: "number" }),
      ],
    }),
  ],
});

