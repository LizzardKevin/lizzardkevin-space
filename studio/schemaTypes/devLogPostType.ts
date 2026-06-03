import { defineField, defineType } from "sanity";

export const devLogPostType = defineType({
  name: "devLogPost",
  title: "Dev Log Post",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" }, validation: (r) => r.required() }),
    defineField({ name: "publishedAt", title: "Published At", type: "datetime" }),
    defineField({ name: "body", title: "Body", type: "array", of: [{ type: "block" }], validation: (r) => r.required() }),
  ],
});

