export default {
  type: "object",
  properties: {
    username: { type: 'string', minLength: 1 },
    type: { type: 'string' },
  },
  required: ['username']
} as const;
