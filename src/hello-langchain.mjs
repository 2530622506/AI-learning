import dotenv from "dotenv"
import { ChatOpenAI } from "@langchain/openai"

// Prefer the project-local .env over any previously exported shell variables.
dotenv.config({ override: true })

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const response = await model.invoke("介绍下自己")
console.log(response.content)
