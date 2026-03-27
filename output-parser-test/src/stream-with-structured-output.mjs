import dotenv from "dotenv"
dotenv.config({ override: true })
import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"

const structuredModelName = process.env.STRUCTURED_MODEL_NAME ?? "qwen-plus"

const model = new ChatOpenAI({
  modelName: structuredModelName,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 使用 zod 定义结构化输出格式
const schema = z.object({
  name: z.string().describe("姓名"),
  birth_year: z.number().describe("出生年份"),
  death_year: z.number().describe("去世年份"),
  nationality: z.string().describe("国籍"),
  occupation: z.string().describe("职业"),
  famous_works: z.array(z.string()).describe("著名作品列表"),
  biography: z.string().describe("简短传记"),
})

const structuredModel = model.withStructuredOutput(schema, {
  method: "jsonSchema",
  name: "extract_mozart_info",
  strict: true,
})

const messages = [
  [
    "system",
    [
      "Return the answer as valid JSON that matches the requested schema.",
      "The top-level object must contain exactly these keys:",
      "name, birth_year, death_year, nationality, occupation, famous_works, biography.",
      "Do not wrap the result in another object such as composer.",
      "birth_year and death_year must be numbers.",
      "famous_works must be an array of strings.",
      "biography must be a plain string, not a nested object.",
    ].join(" "),
  ],
  [
    "human",
    [
      "请介绍莫扎特。",
      "请严格按以下字段返回 JSON：",
      "name、birth_year、death_year、nationality、occupation、famous_works、biography。",
      "不要返回额外字段，不要包一层 composer。",
      "birth_year 和 death_year 返回数字，例如 1756、1791。",
      "biography 返回一段简短中文简介字符串。",
    ].join(" "),
  ],
]

console.log("🌊 流式结构化输出演示（withStructuredOutput）")
console.log(`🤖 当前结构化输出模型: ${structuredModelName}\n`)

try {
  const stream = await structuredModel.stream(messages)

  let chunkCount = 0
  let result = null

  console.log("📡 接收流式数据:\n")

  for await (const chunk of stream) {
    chunkCount++
    result = chunk

    console.log(`[Chunk ${chunkCount}]`)
    console.log(JSON.stringify(chunk, null, 2))
  }

  console.log(`\n✅ 共接收 ${chunkCount} 个数据块\n`)

  if (result) {
    console.log("📊 最终结构化结果:\n")
    console.log(JSON.stringify(result, null, 2))

    console.log("\n📝 格式化输出:")
    console.log(`姓名: ${result.name}`)
    console.log(`出生年份: ${result.birth_year}`)
    console.log(`去世年份: ${result.death_year}`)
    console.log(`国籍: ${result.nationality}`)
    console.log(`职业: ${result.occupation}`)
    console.log(`著名作品: ${result.famous_works.join(", ")}`)
    console.log(`传记: ${result.biography}`)
  }
} catch (error) {
  console.error("\n❌ 错误:", error.message)
}
