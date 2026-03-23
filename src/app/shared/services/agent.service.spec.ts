import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { HttpClient } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';

vi.mock('../../../environments/environment', () => ({
  environment: {
    production: false,
    agentEndpointUrl: 'http://localhost:5001/test/us-central1/agent',
  },
}));

import { AgentService } from './agent.service';

describe('AgentService', () => {
  let spectator: SpectatorService<AgentService>;
  let mockHttp: { post: ReturnType<typeof vi.fn> };

  const createService = createServiceFactory({
    service: AgentService,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttp = { post: vi.fn() };

    spectator = createService({
      providers: [{ provide: HttpClient, useValue: mockHttp }],
    });
  });

  describe('initial state', () => {
    it('should start with an empty messages array', async () => {
      const messages = await firstValueFrom(spectator.service.messages$);
      expect(messages).toEqual([]);
    });

    it('should start with loading = false', async () => {
      const loading = await firstValueFrom(spectator.service.loading$);
      expect(loading).toBe(false);
    });

    it('should expose messages as a getter', () => {
      expect(spectator.service.messages).toEqual([]);
    });
  });

  describe('sendMessage()', () => {
    it('should add the user message immediately', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'Hi!' }));

      await spectator.service.sendMessage('Hello');

      expect(spectator.service.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should append the assistant reply after a successful call', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'Hello from agent!' }));

      await spectator.service.sendMessage('Hello');

      expect(spectator.service.messages).toHaveLength(2);
      expect(spectator.service.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'Hello from agent!',
      });
    });

    it('should attach toolUse to the assistant message when toolsExecuted is returned', async () => {
      const tools = [{ toolName: 'create_item', input: { name: 'Chair' }, result: { id: '1' } }];
      mockHttp.post.mockReturnValue(of({ reply: 'Done', toolsExecuted: tools }));

      await spectator.service.sendMessage('Add a chair');

      expect(spectator.service.messages[1].toolUse).toEqual(tools);
    });

    it('should set toolUse to undefined when toolsExecuted is not returned', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'Just talking' }));

      await spectator.service.sendMessage('hi');

      expect(spectator.service.messages[1].toolUse).toBeUndefined();
    });

    it('should post conversation history and tools to the endpoint', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'ok' }));

      await spectator.service.sendMessage('List items');

      expect(mockHttp.post).toHaveBeenCalledWith(
        'http://localhost:5001/test/us-central1/agent',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'List items' }),
          ]),
          tools: expect.arrayContaining([
            expect.objectContaining({ name: 'create_item' }),
            expect.objectContaining({ name: 'list_items' }),
          ]),
        }),
      );
    });

    it('should set loading to true while waiting, then false when done', async () => {
      const loadingStates: boolean[] = [];
      spectator.service.loading$.subscribe((l) => loadingStates.push(l));

      mockHttp.post.mockReturnValue(of({ reply: 'ok' }));
      await spectator.service.sendMessage('test');

      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });

    it('should add an error message when the HTTP call fails', async () => {
      mockHttp.post.mockReturnValue(throwError(() => new Error('Network error')));

      await spectator.service.sendMessage('Oops');

      expect(spectator.service.messages).toHaveLength(2);
      expect(spectator.service.messages[1].role).toBe('assistant');
      expect(spectator.service.messages[1].content).toContain('⚠️');
    });

    it('should reset loading to false even when HTTP call fails', async () => {
      const loadingStates: boolean[] = [];
      spectator.service.loading$.subscribe((l) => loadingStates.push(l));

      mockHttp.post.mockReturnValue(throwError(() => new Error('fail')));
      await spectator.service.sendMessage('Oops');

      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });

    it('should accumulate multiple messages in order', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'First reply' }));
      await spectator.service.sendMessage('First question');

      mockHttp.post.mockReturnValue(of({ reply: 'Second reply' }));
      await spectator.service.sendMessage('Second question');

      expect(spectator.service.messages).toHaveLength(4);
      expect(spectator.service.messages[0].content).toBe('First question');
      expect(spectator.service.messages[1].content).toBe('First reply');
      expect(spectator.service.messages[2].content).toBe('Second question');
      expect(spectator.service.messages[3].content).toBe('Second reply');
    });

    it('should include timestamps on all messages', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'ok' }));

      await spectator.service.sendMessage('hello');

      expect(spectator.service.messages[0].timestamp).toBeInstanceOf(Date);
      expect(spectator.service.messages[1].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('clearHistory()', () => {
    it('should reset the messages array to empty', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'hi' }));
      await spectator.service.sendMessage('hello');
      expect(spectator.service.messages).toHaveLength(2);

      spectator.service.clearHistory();

      expect(spectator.service.messages).toHaveLength(0);
    });

    it('should emit an empty array on messages$', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'hi' }));
      await spectator.service.sendMessage('hello');

      spectator.service.clearHistory();

      const messages = await firstValueFrom(spectator.service.messages$);
      expect(messages).toEqual([]);
    });
  });
});
