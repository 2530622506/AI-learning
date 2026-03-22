import { MultiServerMCPClient } from "@langchain/mcp-adapters"
import { ChatOpenAI } from "@langchain/openai"
import chalk from "chalk"
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages"
import dotenv from "dotenv"
dotenv.config({ override: true })

const allowedPaths = (process.env.ALLOWED_PATHS || "")
  .split(",")
  .map(path => path.trim())
  .filter(Boolean)

const model = new ChatOpenAI({
  modelName: "qwen3.5-plus",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["/Users/zz/AI learning/codeing/tool-test/src/my-mcp-server.mjs"],
    },
    "amap-maps-streamableHTTP": {
      url: "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY,
    },
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", ...allowedPaths],
    },
  },
})

const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new HumanMessage(query)]

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`))
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`)
      return response.content
    }

    console.log(
      chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`)
    )
    console.log(
      chalk.bgBlue(
        `🔍 工具调用: ${response.tool_calls.map(t => t.name).join(", ")}`
      )
    )
    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find(t => t.name === toolCall.name)
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args)
        let contentStr
        if (typeof toolResult === "string") {
          contentStr = toolResult
        } else if (toolResult && toolResult.text) {
          // 如果返回对象有 text 字段，优先使用
          contentStr = toolResult.text
        }

        messages.push(
          new ToolMessage({
            content: contentStr,
            tool_call_id: toolCall.id,
          })
        )

        // messages.push(
        //   new ToolMessage({
        //     content: toolResult,
        //     tool_call_id: toolCall.id,
        //   })
        // )
      }
    }
  }

  return messages[messages.length - 1].content
}

// 确保 content 是字符串类型

// await runAgentWithTools("北京南站附近的酒店，以及去的路线")
await runAgentWithTools(
  "北京南站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/zz/Desktop 的一个 md 文件"
)

await mcpClient.close()
