import dotenv from "dotenv"
dotenv.config({ override: true })
import { z } from "zod"
import { ChatOpenAI } from "@langchain/openai"

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
})

const ticketSchema = z.object({
  intent: z
    .enum([
      "refund",
      "logistics",
      "after_sales",
      "product_question",
      "complaint",
    ])
    .describe("用户意图"),
  priority: z.enum(["low", "medium", "high"]).describe("工单优先级"),
  product: z.string().describe("涉及的产品或服务"),
  requires_human: z.boolean().describe("是否需要转人工"),
  summary: z.string().describe("工单摘要，50 字以内"),
  tags: z.array(z.string()).describe("标签列表"),
})

// DashScope 的 OpenAI 兼容接口对 json_schema 模式兼容不稳定，
// 对 Qwen 显式改用 function calling 更稳。
const structuredModel = model.withStructuredOutput(ticketSchema, {
  method: "functionCalling",
})

const result = await structuredModel.invoke(
  [
    [
      "system",
      [
        "你是电商售后工单分类助手。",
        "必须严格按 schema 返回结构化结果。",
        "intent 只能是 refund、logistics、after_sales、product_question、complaint 之一。",
        "priority 只能是 low、medium、high 之一。",
      ].join(" "),
    ],
    [
      "human",
      "昨天买的破壁机今天就不转了，客服一直没人回。我明天要带老人去医院，没时间反复沟通，请尽快处理。",
    ],
  ]
)

console.log(result)
