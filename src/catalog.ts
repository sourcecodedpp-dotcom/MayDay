import { Catalog } from "@json-render/core";
import { z } from "zod";

export const catalog: Catalog = {
  components: {
    Container: {
      props: z.object({
        direction: z.enum(["row", "col"]).default("col"),
        gap: z.number().default(4),
        padding: z.number().default(4),
      }),
      slots: ["default"],
    },
    FraudMetric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        alert: z.boolean().default(false),
      }),
    },
    DossierCard: {
      props: z.object({
        title: z.string(),
      }),
      slots: ["default"],
    },
    Verdict: {
      props: z.object({
        status: z.enum(["fraud", "cleared", "investigating"]),
        reason: z.string(),
      }),
    },
    Text: {
      props: z.object({
        content: z.string(),
        style: z.enum(["normal", "bold", "muted"]).default("normal"),
      }),
    }
  }
};
