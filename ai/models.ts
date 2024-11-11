export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    apiIdentifier: 'gpt-3.5-turbo',
    description: 'Optimized for conversational tasks with high efficiency and accuracy',
  },
  {
    id: 'gpt-4',
    label: 'GPT-4',
    apiIdentifier: 'gpt-4',
    description: 'For advanced, high-complexity tasks and detailed responses',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT 4o Mini',
    apiIdentifier: 'gpt-4o-mini',
    description: 'Small model for fast, lightweight tasks',
  },
  {
    id: 'gpt-4o',
    label: 'GPT 4o',
    apiIdentifier: 'gpt-4o',
    description: 'For complex, multi-step tasks',
  },
] as const;

export const DEFAULT_MODEL_NAME: string = 'gpt-3.5-turbo';
