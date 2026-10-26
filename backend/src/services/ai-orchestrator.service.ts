import { ContextService } from './context.service.js';
import { AIProviderService } from './ai-provider.service.js';
import { toolsRegistry } from './tool-registry.service.js';
import { query } from '../db/index.js';

export class AIOrchestratorService {
    static async handleMessage(userId: string, boardId: string, message: string) {
        // 1. Build Board Context Snapshot & Evaluate Risks
        const context = await ContextService.build(userId, boardId);

        const systemPrompt = `You are an AI Technical Program Manager (TPM). Board context: ${JSON.stringify(
        context
        )}`;

        // 2. Query AI Provider
        const aiResponse = await AIProviderService.generate(systemPrompt, message, Object.values(toolsRegistry));

        // 3. Handle Tool Execution Strategy
        if (aiResponse.type === 'tool_call' && aiResponse.toolCall) {
        const tool = toolsRegistry[aiResponse.toolCall.name];

        if (tool && tool.isWrite) {
            // Create pending action record in DB (Human-in-the-loop approval)
            const actionRes = await query(
            `INSERT INTO ai_actions (task_id, tool_name, tool_args, reason, status, requested_by)
            VALUES ($1, $2, $3, $4, 'pending_approval', $5)
            RETURNING id, tool_name AS "toolName", tool_args AS "toolArgs", status`,
            [
                aiResponse.toolCall.args.taskId || null,
                tool.name,
                JSON.stringify(aiResponse.toolCall.args),
                `AI proposed ${tool.name}`,
                userId,
            ]
            );

            return {
            type: 'action_proposal',
            action: actionRes.rows[0],
            };
        }
        }

        return {
        type: 'text',
        content: aiResponse.text || 'Analysis completed.',
        };
    }
}