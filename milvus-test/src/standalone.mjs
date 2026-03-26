import dotenv from "dotenv"
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node"
import { OpenAIEmbeddings } from "@langchain/openai"

dotenv.config({ override: true })

const COLLECTION_NAME = "kb_chunks"
const VECTOR_DIM = 1024

const client = new MilvusClient({
  address: "localhost:19530",
})

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: VECTOR_DIM,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const chunks = [
  {
    id: "policy_001_0",
    doc_id: "policy_001",
    title: "员工报销制度",
    source: "expense-policy.md",
    chunk_index: 0,
    updated_at: "2026-03-20",
    content:
      "员工差旅报销需在出差结束后的 10 个自然日内提交，逾期需要直属主管补充说明。",
  },
  {
    id: "policy_001_1",
    doc_id: "policy_001",
    title: "员工报销制度",
    source: "expense-policy.md",
    chunk_index: 1,
    updated_at: "2026-03-20",
    content:
      "住宿费超过标准金额时，需要上传审批截图，并由部门负责人进行二次确认。",
  },
]

async function embed(text) {
  return embeddings.embedQuery(text)
}

async function ensureCollection() {
  const { value: exists } = await client.hasCollection({
    collection_name: COLLECTION_NAME,
  })

  if (exists) {
    console.log(`Collection "${COLLECTION_NAME}" already exists`)
    return
  }

  console.log(`Creating collection "${COLLECTION_NAME}"...`)
  await client.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      {
        name: "id",
        data_type: DataType.VarChar,
        is_primary_key: true,
        max_length: 64,
      },
      {
        name: "vector",
        data_type: DataType.FloatVector,
        dim: VECTOR_DIM,
      },
      {
        name: "content",
        data_type: DataType.VarChar,
        max_length: 8192,
      },
      {
        name: "doc_id",
        data_type: DataType.VarChar,
        max_length: 64,
      },
      {
        name: "title",
        data_type: DataType.VarChar,
        max_length: 256,
      },
      {
        name: "source",
        data_type: DataType.VarChar,
        max_length: 256,
      },
      {
        name: "chunk_index",
        data_type: DataType.Int64,
      },
      {
        name: "updated_at",
        data_type: DataType.VarChar,
        max_length: 32,
      },
    ],
  })

  console.log("Creating index...")
  await client.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: "vector",
    index_type: IndexType.IVF_FLAT,
    metric_type: MetricType.COSINE,
    params: { nlist: 1024 },
  })
}

async function main() {
  try {
    console.log("Connecting to Milvus...")
    await client.connectPromise
    console.log("Connected")

    await ensureCollection()

    console.log("Loading collection...")
    await client.loadCollection({
      collection_name: COLLECTION_NAME,
    })

    console.log("Generating embeddings...")
    const rows = await Promise.all(
      chunks.map(async item => ({
        ...item,
        vector: await embed(item.content),
      }))
    )

    console.log("Upserting rows...")
    const result = await client.upsert({
      collection_name: COLLECTION_NAME,
      data: rows,
    })

    console.log(
      `Upsert finished. success=${result.succ_index?.length ?? 0}, failed=${result.err_index?.length ?? 0}`
    )
  } catch (error) {
    console.error("Error:", error.message)
  }
}

main()
