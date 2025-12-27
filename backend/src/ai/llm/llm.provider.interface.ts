export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMProvider {
    generate(messages: LLMMessage[], modelOverride?: string): Promise<string>;
}
