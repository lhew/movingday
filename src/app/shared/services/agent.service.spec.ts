import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
  let service: AgentService;
  let mockHttp: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttp = { post: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AgentService,
        { provide: HttpClient, useValue: mockHttp },
      ],
    });

    service = TestBed.inject(AgentService);
  });

  describe('initial state', () => {
    it('should start with an empty messages array', async () => {
      const messages = await firstValueFrom(service.messages$);
      expect(messages).toEqual([]);
    });

    it('should start with loading = false', async () => {
      const loading = await firstValueFrom(service.loading$);
      expect(loading).toBe(false);
    });

    it('should expose messages as a getter', () => {
      expect(service.messages).toEqual([]);
    });
  });

  describe('sendMessage()', () => {
    it('should add the user message immediately', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'Hi!' }));

      await service.sendMessage('Hello');

      expect(service.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should append the assistant reply after a successful call', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'Hello from agent!' }));

      await service.sendMessage('Hello');

      expect(service.messages).toHaveLength(2);
      expect(service.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'Hello from agent!',
      });
    });

    it('should attach toolUse to the assistant message when toolsExecuted is returned', async () => {
      const tools = [{ toolName: 'create_item', input: { name: 'Chair' }, result: { id: '1' } }];
      mockHttp.post.mockReturnValue(of({ reply: 'Done', toolsExecuted: tools }));

      await service.sendMessage('Add a chair');

      expect(service.messages[1].toolUse).toEqual(tools);
    });

    it('should set toolUse to undefined when toolsExecuted is not returned', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'Just talking' }));

      await service.sendMessage('hi');

      expect(service.messages[1].toolUse).toBeUndefined();
    });

    it('should post conversation history and tools to the endpoint', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'ok' }));

      await service.sendMessage('List items');

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
      service.loading$.subscribe((l) => loadingStates.push(l));

      mockHttp.post.mockReturnValue(of({ reply: 'ok' }));
      await service.sendMessage('test');

      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });

    it('should add an error message when the HTTP call fails', async () => {
      mockHttp.post.mockReturnValue(throwError(() => new Error('Network error')));

      await service.sendMessage('Oops');

      expect(service.messages).toHaveLength(2);
      expect(service.messages[1].role).toBe('assistant');
      expect(service.messages[1].content).toContain('⚠️');
    });

    it('should reset loading to false even when HTTP call fails', async () => {
      const loadingStates: boolean[] = [];
      service.loading$.subscribe((l) => loadingStates.push(l));

      mockHttp.post.mockReturnValue(throwError(() => new Error('fail')));
      await service.sendMessage('Oops');

      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });

    it('should accumulate multiple messages in order', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'First reply' }));
      await service.sendMessage('First question');

      mockHttp.post.mockReturnValue(of({ reply: 'Second reply' }));
      await service.sendMessage('Second question');

      expect(service.messages).toHaveLength(4);
      expect(service.messages[0].content).toBe('First question');
      expect(service.messages[1].content).toBe('First reply');
      expect(service.messages[2].content).toBe('Second question');
      expect(service.messages[3].content).toBe('Second reply');
    });

    it('should include timestamps on all messages', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'ok' }));

      await service.sendMessage('hello');

      expect(service.messages[0].timestamp).toBeInstanceOf(Date);
      expect(service.messages[1].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('clearHistory()', () => {
    it('should reset the messages array to empty', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'hi' }));
      await service.sendMessage('hello');
      expect(service.messages).toHaveLength(2);

      service.clearHistory();

      expect(service.messages).toHaveLength(0);
    });

    it('should emit an empty array on messages$', async () => {
      mockHttp.post.mockReturnValue(of({ reply: 'hi' }));
      await service.sendMessage('hello');

      service.clearHistory();

      const messages = await firstValueFrom(service.messages$);
      expect(messages).toEqual([]);
    });
  });
});
