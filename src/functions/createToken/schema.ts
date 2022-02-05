export default {
  type: "object",
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string' },
  },
  required: ['username', 'password']
} as const;
