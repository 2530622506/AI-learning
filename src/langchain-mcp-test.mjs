
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config({ override: true });

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["/Users/zz/AI learning/codeing/tool-test/src/my-mcp-server.mjs"],
    },
  },
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

async function getResourceContent() {
  const resourcesByServer = await mcpClient.listResources();
  let resourceContent = "";

  for (const [serverName, resources] of Object.entries(resourcesByServer)) {
    for (const resource of resources) {
      const contents = await mcpClient.readResource(serverName, resource.uri);

      for (const item of contents) {
        if (item.type === "text" && item.text) {
          resourceContent += `${item.text}\n`;
        }
      }
    }
  }

  return resourceContent.trim();
}

async function runAgentWithTools(query, maxIterations = 30) {
  const resourceContent = await getResourceContent();
  const messages = [];

  if (resourceContent) {
    messages.push(new SystemMessage(resourceContent));
  }

  messages.push(new HumanMessage(query));

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen("⏳ 正在等待 AI 思考..."));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
    console.log(
      chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map((tool) => tool.name).join(", ")}`)
    );

    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((tool) => tool.name === toolCall.name);

      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
          })
        );
      }
    }
  }

  return messages[messages.length - 1]?.content;
}

try {
  await runAgentWithTools("MCP Server 使用指南");
} finally {
  await mcpClient.close();
}
