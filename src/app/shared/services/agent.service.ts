import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentMessage, AgentTool } from '../models/agent.model';

// The tools available to the Claude agent — these are executed server-side
// in the Cloud Function and applied directly to Firestore
const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'create_item',
    description: 'Add a new item to the donation showcase. Use this when Leo wants to list something for give-away.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        description: { type: 'string', description: 'Friendly description of the item' },
        condition: {
          type: 'string',
          enum: ['new', 'like-new', 'good', 'fair', 'worn'],
          description: 'Physical condition of the item',
        },
        category: { type: 'string', description: 'Category (furniture, books, electronics, clothes, kitchen, etc.)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Searchable tags' },
      },
      required: ['name', 'description', 'condition'],
    },
  },
  {
    name: 'update_item',
    description: 'Update an existing item in the showcase. Use to change description, condition, or status.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Firestore document ID of the item' },
        name: { type: 'string' },
        description: { type: 'string' },
        condition: { type: 'string', enum: ['new', 'like-new', 'good', 'fair', 'worn'] },
        status: { type: 'string', enum: ['available', 'claimed', 'gone'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_item',
    description: 'Remove an item from the showcase completely.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Firestore document ID of the item to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_items',
    description: 'Get all current items in the showcase with their status.',
    input_schema: {
      type: 'object',
      properties: {
        status_filter: {
          type: 'string',
          enum: ['all', 'available', 'claimed', 'gone'],
          description: 'Filter by status. Defaults to all.',
        },
      },
    },
  },
  {
    name: 'create_update',
    description: 'Publish a new moving update / blog post so followers know what\'s happening.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Catchy title for the update' },
        content: { type: 'string', description: 'Full content (markdown supported)' },
        summary: { type: 'string', description: 'One-sentence teaser shown on the list page' },
        emoji: { type: 'string', description: 'A single emoji that represents the vibe of this update' },
        pinned: { type: 'boolean', description: 'Whether to pin this to the top' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'delete_update',
    description: 'Delete a moving update post.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Firestore document ID of the update' },
      },
      required: ['id'],
    },
  },
];

@Injectable({ providedIn: 'root' })
export class AgentService {
  private http = inject(HttpClient);

  private _messages = new BehaviorSubject<AgentMessage[]>([]);
  readonly messages$ = this._messages.asObservable();

  private _loading = new BehaviorSubject(false);
  readonly loading$ = this._loading.asObservable();

  get messages() {
    return this._messages.getValue();
  }

  /** Send a message to the Claude agent and get a response */
  async sendMessage(userText: string): Promise<void> {
    const userMsg: AgentMessage = {
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    this._messages.next([...this.messages, userMsg]);
    this._loading.next(true);

    try {
      // The conversation history is sent to the Cloud Function
      // which calls Claude and executes any tool calls on the backend
      const response = await lastValueFrom(
        this.http.post<{ reply: string; toolsExecuted?: AgentMessage['toolUse'] }>(
          environment.agentEndpointUrl,
          {
            messages: this.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            tools: AGENT_TOOLS,
          }
        )
      );

      const assistantMsg: AgentMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        toolUse: response.toolsExecuted,
      };

      this._messages.next([...this.messages, assistantMsg]);
    } catch (err) {
      const errorMsg: AgentMessage = {
        role: 'assistant',
        content: '⚠️ Something went wrong talking to the agent. Check the Cloud Function logs.',
        timestamp: new Date(),
      };
      this._messages.next([...this.messages, errorMsg]);
      console.error('Agent error:', err);
    } finally {
      this._loading.next(false);
    }
  }

  clearHistory() {
    this._messages.next([]);
  }
}
