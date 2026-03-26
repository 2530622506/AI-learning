import dotenv from "dotenv"
dotenv.config({ override: true })
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node"
import { OpenAIEmbeddings } from "@langchain/openai"

const COLLECTION_NAME = "ebook_collection"
const VECTOR_DIM = 1024

// 初始化 Embeddings 模型, 用于将文本转换为向量
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
})

// 初始化 Milvus 客户端, 用于与 Milvus 数据库进行交互
const client = new MilvusClient({
  address: "localhost:19530",
})

// 将文本转换为向量, 用于向量搜索
async function getEmbedding(text) {
  // 使用 OpenAI 的 embeddings 模型将文本转换为向量
  const result = await embeddings.embedQuery(text)
  return result
}

async function main() {
  try {
    console.log("Connecting to Milvus...")
    // 连接到 Milvus 数据库
    await client.connectPromise
    console.log("✓ Connected\n")

    // 确保集合已加载
    try {
      await client.loadCollection({ collection_name: COLLECTION_NAME })
      console.log("✓ 集合已加载\n")
    } catch (error) {
      // 如果已经加载，会报错，忽略即可
      if (!error.message.includes("already loaded")) {
        throw error
      }
      console.log("✓ 集合已处于加载状态\n")
    }

    // 向量搜索
    console.log("Searching for similar ebook content...")
    const query = "段誉会什么武功？"
    console.log(`Query: "${query}"\n`)

    // 将文本转换为向量, 用于向量搜索
    const queryVector = await getEmbedding(query)
    // 执行向量搜索
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: 3,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "book_id", "chapter_num", "index", "content"],
    })

    console.log(`Found ${searchResult.results.length} results:\n`)
    searchResult.results.forEach((item, index) => {
      console.log(`${index + 1}. [Score: ${item.score.toFixed(4)}]`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Book ID: ${item.book_id}`)
      console.log(`   Chapter: 第 ${item.chapter_num} 章`)
      console.log(`   Index: ${item.index}`)
      console.log(`   Content: ${item.content}\n`)
    })
  } catch (error) {
    console.error("Error:", error.message)
  }
}

main()
