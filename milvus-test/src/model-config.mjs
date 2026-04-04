import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"

const DASHSCOPE_COMPATIBLE_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1"
const CODING_PLAN_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1"

function normalizeBaseURL(baseURL) {
  return baseURL?.replace(/\/+$/, "")
}

function requireEnv(name, value, extraHint) {
  if (value) {
    return value
  }

  const suffix = extraHint ? `，${extraHint}` : ""
  throw new Error(`缺少环境变量 ${name}${suffix}`)
}

function buildDashScopeMismatchMessage(baseURL) {
  return [
    `当前 embeddings 使用的 Base URL 是 ${baseURL}，它指向阿里云 Coding Plan 网关。`,
    "该网关使用 sk-sp- 开头的专属 API Key，只支持 Coding Plan 对应的模型调用，不支持 Embedding 接口。",
    "请为向量模型单独配置百炼兼容模式参数，例如：",
    `EMBEDDINGS_BASE_URL=${DASHSCOPE_COMPATIBLE_BASE_URL}`,
    "EMBEDDINGS_API_KEY=<你的百炼 API Key>",
    "EMBEDDINGS_MODEL_NAME=text-embedding-v4",
  ].join("\n")
}

function buildDashScopeKeyMismatchMessage(baseURL) {
  return [
    `当前 embeddings 使用的 Base URL 是 ${baseURL}，但 API Key 仍然是 Coding Plan 专属 Key（sk-sp- 开头）。`,
    "根据阿里云百炼文档，Coding Plan 专属 API Key 必须配合 coding.dashscope.aliyuncs.com 使用，不能直接用于兼容模式 Embedding 接口。",
    "请为 embeddings 单独配置 EMBEDDINGS_API_KEY，并使用百炼兼容模式地址。",
  ].join("\n")
}

function validateEmbeddingsConfig({ apiKey, baseURL }) {
  const normalizedBaseURL = normalizeBaseURL(baseURL)

  if (normalizedBaseURL?.includes("coding.dashscope.aliyuncs.com")) {
    throw new Error(buildDashScopeMismatchMessage(normalizedBaseURL))
  }

  if (
    normalizedBaseURL?.includes("dashscope.aliyuncs.com/compatible-mode/v1") &&
    apiKey.startsWith("sk-sp-")
  ) {
    throw new Error(buildDashScopeKeyMismatchMessage(normalizedBaseURL))
  }
}

export function createChatModel({ temperature = 0.7 } = {}) {
  const apiKey = requireEnv("OPENAI_API_KEY", process.env.OPENAI_API_KEY)
  const baseURL = normalizeBaseURL(
    requireEnv("OPENAI_BASE_URL", process.env.OPENAI_BASE_URL)
  )
  const model = requireEnv("MODEL_NAME", process.env.MODEL_NAME)

  return new ChatOpenAI({
    temperature,
    model,
    apiKey,
    configuration: {
      baseURL,
    },
  })
}

export function createEmbeddings({ dimensions } = {}) {
  const apiKey = requireEnv(
    "EMBEDDINGS_API_KEY 或 OPENAI_API_KEY",
    process.env.EMBEDDINGS_API_KEY ?? process.env.OPENAI_API_KEY,
    "请至少提供一组可用的向量模型密钥"
  )
  const baseURL = normalizeBaseURL(
    requireEnv(
      "EMBEDDINGS_BASE_URL 或 OPENAI_BASE_URL",
      process.env.EMBEDDINGS_BASE_URL ?? process.env.OPENAI_BASE_URL,
      "请至少提供一组可用的向量模型地址"
    )
  )
  const model = requireEnv(
    "EMBEDDINGS_MODEL_NAME",
    process.env.EMBEDDINGS_MODEL_NAME
  )

  validateEmbeddingsConfig({ apiKey, baseURL })

  return new OpenAIEmbeddings({
    apiKey,
    model,
    dimensions,
    configuration: {
      baseURL,
    },
  })
}

export { CODING_PLAN_BASE_URL, DASHSCOPE_COMPATIBLE_BASE_URL }
