export default {
  type: "object",
  properties: {
    studentId: { type: 'string', minLength: 1 },
    fullName: { type: 'string' },
    classId: { type: 'string' },
    password: { type: 'string' },
  },
  required: ['studentId', 'fullName', 'classId', 'password']
} as const;
